const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors()); // 允许 Vue 前端跨域访问
app.use(express.json()); // 解析前端发来的 JSON 数据

// 配置静态资源目录
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// 确保上传目录存在
const uploadDir = path.join(__dirname, 'public/uploads/avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB 限制
  },
  fileFilter: (req, file, cb) => {
    // 只允许图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  }
});

// JWT 密钥（生产环境应该放在环境变量中）
const JWT_SECRET = 'idegg-secret-key-2024';

// 1. 配置数据库连接
const db = mysql.createConnection({
  host: '101.133.231.222', // 你的服务器 IP
// host: '127.0.0.1', // 建议本地连接用这个
  user: 'idegg',   // 宝塔里看到的那个
  password: '8bp7TytYs6ets7LF', // 数据库密码
  database: 'idegg',
  connectTimeout: 5000
});

// 2. 检查连接
db.connect(err => {
  if (err) return console.error('数据库连接失败: ' + err.message);
  console.log('✅ 成功连接到远程 idegg 数据库！');

  // 创建 users 表（如果不存在）
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      avatar VARCHAR(255) DEFAULT NULL,
      skills TEXT DEFAULT NULL,
      bio TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;
  db.query(createUsersTable, (err) => {
    if (err) console.error('创建 users 表失败:', err);
    else console.log('✅ users 表已就绪');
  });

  // 创建 eggs 表（添加 user_id 字段）
  const createEggsTable = `
    CREATE TABLE IF NOT EXISTS eggs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT DEFAULT NULL,
      name VARCHAR(255) NOT NULL,
      color VARCHAR(50) DEFAULT '#FFFFFF',
      pos_x FLOAT DEFAULT 0,
      pos_y FLOAT DEFAULT 0,
      pos_z FLOAT DEFAULT 0,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `;
  db.query(createEggsTable, (err) => {
    if (err) console.error('创建 eggs 表失败:', err);
    else console.log('✅ eggs 表已就绪');
  });

  // 为已存在的 eggs 表添加 user_id 字段（MySQL 兼容写法）
  const checkColumnSql = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eggs' AND COLUMN_NAME = 'user_id' AND TABLE_SCHEMA = DATABASE()`;
  db.query(checkColumnSql, (err, results) => {
    if (err) {
      console.error('检查 eggs 表结构失败:', err);
      return;
    }
    
    if (results.length === 0) {
      // 字段不存在，添加它
      const addUserIdSql = `ALTER TABLE eggs ADD COLUMN user_id INT DEFAULT NULL, ADD CONSTRAINT fk_eggs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL`;
      db.query(addUserIdSql, (err) => {
        if (err) console.error('添加 user_id 字段失败:', err);
        else console.log('✅ eggs.user_id 字段添加成功');
      });
    } else {
      console.log('💡 eggs.user_id 字段已存在');
    }
  });

  // 创建 comments 表
  const createCommentsTable = `
    CREATE TABLE IF NOT EXISTS comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      egg_id INT NOT NULL,
      user_id INT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (egg_id) REFERENCES eggs(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `;
  db.query(createCommentsTable, (err) => {
    if (err) console.error('创建 comments 表失败:', err);
    else console.log('✅ comments 表已就绪');
  });

  // 创建 egg_ratings 表（人类评分表）
  const createEggRatingsTable = `
    CREATE TABLE IF NOT EXISTS egg_ratings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      egg_id INT NOT NULL,
      user_id INT NOT NULL,
      score TINYINT NOT NULL CHECK (score >= 1 AND score <= 5),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (egg_id) REFERENCES eggs(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_egg_rating (egg_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `;
  db.query(createEggRatingsTable, (err) => {
    if (err) console.error('创建 egg_ratings 表失败:', err);
    else console.log('✅ egg_ratings 表已就绪');
  });

  // ========== 扩展功能：蛋池、好友、私信 ==========

  // 创建 egg_pools 表（蛋池表）
  const createEggPoolsTable = `
    CREATE TABLE IF NOT EXISTS egg_pools (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      owner_id INT NOT NULL,
      type ENUM('public', 'private') DEFAULT 'public',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `;
  db.query(createEggPoolsTable, (err) => {
    if (err) {
      console.error('创建 egg_pools 表失败:', err);
      return;
    }
    console.log('✅ egg_pools 表已就绪');
    
    // 检查是否需要创建默认公共蛋池
    const checkDefaultPool = 'SELECT id FROM egg_pools WHERE type = "public" LIMIT 1';
    db.query(checkDefaultPool, (err, results) => {
      if (err) {
        console.error('检查默认蛋池失败:', err);
        return;
      }
      
      // 如果没有公共蛋池，创建一个默认的
      if (results.length === 0) {
        // 先查找第一个用户作为默认蛋池的创建者
        const findFirstUser = 'SELECT id FROM users LIMIT 1';
        db.query(findFirstUser, (err, users) => {
          if (err || users.length === 0) {
            console.log('暂无用户，跳过创建默认蛋池');
            return;
          }
          
          const firstUserId = users[0].id;
          const createDefaultPool = 'INSERT INTO egg_pools (name, owner_id, type) VALUES (?, ?, ?)';
          db.query(createDefaultPool, ['公共蛋池', firstUserId, 'public'], (err, result) => {
            if (err) {
              console.error('创建默认公共蛋池失败:', err);
              return;
            }
            
            const poolId = result.insertId;
            // 将创建者加入蛋池成员
            const addMember = 'INSERT INTO pool_members (pool_id, user_id) VALUES (?, ?)';
            db.query(addMember, [poolId, firstUserId], (err) => {
              if (err) {
                console.error('添加创建者到默认蛋池失败:', err);
                return;
              }
              console.log('✅ 已创建默认公共蛋池 (ID:', poolId + ')');
            });
          });
        });
      }
    });
  });

  // 创建 pool_members 表（蛋池成员表）
  const createPoolMembersTable = `
    CREATE TABLE IF NOT EXISTS pool_members (
      pool_id INT NOT NULL,
      user_id INT NOT NULL,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (pool_id, user_id),
      FOREIGN KEY (pool_id) REFERENCES egg_pools(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `;
  db.query(createPoolMembersTable, (err) => {
    if (err) console.error('创建 pool_members 表失败:', err);
    else console.log('✅ pool_members 表已就绪');
  });

  // 创建 friendships 表（好友表）
  const createFriendshipsTable = `
    CREATE TABLE IF NOT EXISTS friendships (
      user_id1 INT NOT NULL,
      user_id2 INT NOT NULL,
      status ENUM('pending', 'accepted', 'blocked') DEFAULT 'pending',
      action_user_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id1, user_id2),
      FOREIGN KEY (user_id1) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id2) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (action_user_id) REFERENCES users(id) ON DELETE CASCADE,
      CHECK (user_id1 < user_id2)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `;
  db.query(createFriendshipsTable, (err) => {
    if (err) console.error('创建 friendships 表失败:', err);
    else console.log('✅ friendships 表已就绪');
  });

  // 创建 messages 表（私信表）
  const createMessagesTable = `
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_id INT NOT NULL,
      receiver_id INT NOT NULL,
      content TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `;
  db.query(createMessagesTable, (err) => {
    if (err) console.error('创建 messages 表失败:', err);
    else console.log('✅ messages 表已就绪');
  });

  // 为 eggs 表添加 pool_id 字段（如果还不存在）
  const checkPoolIdColumnSql = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'eggs' AND COLUMN_NAME = 'pool_id' AND TABLE_SCHEMA = DATABASE()`;
  db.query(checkPoolIdColumnSql, (err, results) => {
    if (err) {
      console.error('检查 eggs 表 pool_id 字段失败:', err);
      return;
    }
    
    if (results.length === 0) {
      // 字段不存在，添加它
      const addPoolIdSql = `ALTER TABLE eggs ADD COLUMN pool_id INT DEFAULT NULL, ADD CONSTRAINT fk_eggs_pool FOREIGN KEY (pool_id) REFERENCES egg_pools(id) ON DELETE SET NULL`;
      db.query(addPoolIdSql, (err) => {
        if (err) console.error('添加 pool_id 字段失败:', err);
        else console.log('✅ eggs.pool_id 字段添加成功');
      });
    } else {
      console.log('💡 eggs.pool_id 字段已存在');
    }
  });
});

// ========== 用户认证接口 ==========

// 注册接口
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ status: 'error', message: '用户名和密码不能为空' });
  }
  
  if (username.length < 3 || username.length > 50) {
    return res.status(400).json({ status: 'error', message: '用户名长度应在3-50个字符之间' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ status: 'error', message: '密码长度至少6个字符' });
  }
  
  try {
    // 检查用户名是否已存在
    const checkSql = 'SELECT id FROM users WHERE username = ?';
    db.query(checkSql, [username], async (err, results) => {
      if (err) return res.status(500).json({ status: 'error', message: '数据库错误' });
      
      if (results.length > 0) {
        return res.status(409).json({ status: 'error', message: '用户名已存在' });
      }
      
      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // 插入新用户
      const insertSql = 'INSERT INTO users (username, password) VALUES (?, ?)';
      db.query(insertSql, [username, hashedPassword], (err, result) => {
        if (err) return res.status(500).json({ status: 'error', message: '注册失败' });
        
        res.json({ 
          status: 'success', 
          message: '注册成功',
          userId: result.insertId 
        });
      });
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: '服务器错误' });
  }
});

// 登录接口
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ status: 'error', message: '用户名和密码不能为空' });
  }
  
  const sql = 'SELECT * FROM users WHERE username = ?';
  db.query(sql, [username], async (err, results) => {
    if (err) return res.status(500).json({ status: 'error', message: '数据库错误' });
    
    if (results.length === 0) {
      return res.status(401).json({ status: 'error', message: '用户名或密码错误' });
    }
    
    const user = results[0];
    
    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ status: 'error', message: '用户名或密码错误' });
    }
    
    // 生成 JWT Token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      status: 'success',
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        created_at: user.created_at
      }
    });
  });
});

// 验证 Token 中间件
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: '未提供认证令牌' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ status: 'error', message: '令牌无效或已过期' });
  }
};

// 获取当前用户信息接口（需要认证）
app.get('/api/me', authMiddleware, (req, res) => {
  res.json({
    status: 'success',
    user: req.user
  });
});

// ========== 用户资料接口 ==========

// 获取用户完整资料
app.get('/api/user/profile', authMiddleware, (req, res) => {
  const userId = req.user.userId;

  const sql = 'SELECT id, username, avatar, skills, bio, created_at, updated_at FROM users WHERE id = ?';
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('获取用户资料失败:', err);
      return res.status(500).json({ status: 'error', message: '数据库错误' });
    }

    if (results.length === 0) {
      return res.status(404).json({ status: 'error', message: '用户不存在' });
    }

    const user = results[0];

    // 解析 skills JSON
    let skills = [];
    try {
      skills = user.skills ? JSON.parse(user.skills) : [];
    } catch (e) {
      skills = [];
    }

    res.json({
      status: 'success',
      data: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        skills: skills,
        bio: user.bio,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });
  });
});

// 更新用户资料
app.put('/api/user/profile', authMiddleware, async (req, res) => {
  const userId = req.user.userId;
  const { username, avatar, skills, bio, currentPassword, newPassword } = req.body;

  try {
    // 构建更新字段
    const updates = [];
    const values = [];

    // 更新用户名
    if (username !== undefined) {
      if (username.length < 3 || username.length > 50) {
        return res.status(400).json({ status: 'error', message: '用户名长度应在3-50个字符之间' });
      }
      updates.push('username = ?');
      values.push(username);
    }

    // 更新头像
    if (avatar !== undefined) {
      updates.push('avatar = ?');
      values.push(avatar);
    }

    // 更新技能（数组转JSON存储）
    if (skills !== undefined) {
      updates.push('skills = ?');
      values.push(JSON.stringify(skills));
    }

    // 更新简介
    if (bio !== undefined) {
      updates.push('bio = ?');
      values.push(bio);
    }

    // 修改密码（需要验证当前密码）
    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ status: 'error', message: '新密码长度至少6个字符' });
      }

      if (!currentPassword) {
        return res.status(400).json({ status: 'error', message: '请提供当前密码' });
      }

      // 验证当前密码
      const [user] = await new Promise((resolve, reject) => {
        db.query('SELECT password FROM users WHERE id = ?', [userId], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ status: 'error', message: '当前密码错误' });
      }

      // 加密新密码
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }

    // 如果没有要更新的字段
    if (updates.length === 0) {
      return res.status(400).json({ status: 'error', message: '没有提供要更新的字段' });
    }

    // 执行更新
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    values.push(userId);

    db.query(sql, values, (err, result) => {
      if (err) {
        console.error('更新用户资料失败:', err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ status: 'error', message: '用户名已存在' });
        }
        return res.status(500).json({ status: 'error', message: '更新失败' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ status: 'error', message: '用户不存在' });
      }

      res.json({
        status: 'success',
        message: '资料更新成功'
      });
    });

  } catch (error) {
    console.error('更新资料时出错:', error);
    res.status(500).json({ status: 'error', message: '服务器错误' });
  }
});

// ========== 蛋池 (Egg Pools) 相关接口 ==========

// 1. 创建新蛋池
app.post('/api/pools', authMiddleware, (req, res) => {
  const { name, type = 'public' } = req.body;
  const userId = req.user.userId;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ status: 'error', message: '蛋池名称不能为空' });
  }

  if (!['public', 'private'].includes(type)) {
    return res.status(400).json({ status: 'error', message: '蛋池类型只能是 public 或 private' });
  }

  // 创建蛋池
  const createPoolSql = 'INSERT INTO egg_pools (name, owner_id, type) VALUES (?, ?, ?)';
  db.query(createPoolSql, [name.trim(), userId, type], (err, result) => {
    if (err) {
      console.error('创建蛋池失败:', err);
      return res.status(500).json({ status: 'error', message: '创建蛋池失败' });
    }

    const poolId = result.insertId;

    // 自动将创建者加入 pool_members
    const addMemberSql = 'INSERT INTO pool_members (pool_id, user_id) VALUES (?, ?)';
    db.query(addMemberSql, [poolId, userId], (err) => {
      if (err) {
        console.error('添加创建者到蛋池成员失败:', err);
        // 即使成员添加失败，蛋池已创建成功，仍返回成功
      }

      res.json({
        status: 'success',
        message: '蛋池创建成功',
        data: {
          id: poolId,
          name: name.trim(),
          type: type,
          owner_id: userId
        }
      });
    });
  });
});

// 2. 获取当前用户有权查看的所有蛋池列表
app.get('/api/pools', authMiddleware, (req, res) => {
  const userId = req.user.userId;

  // 查询公共池子 + 用户是成员的私有池子
  const sql = `
    SELECT DISTINCT
      ep.id,
      ep.name,
      ep.type,
      ep.owner_id,
      ep.created_at,
      u.username as owner_name,
      (ep.owner_id = ?) as is_owner
    FROM egg_pools ep
    LEFT JOIN users u ON ep.owner_id = u.id
    WHERE ep.type = 'public'
    OR ep.id IN (
      SELECT pool_id FROM pool_members WHERE user_id = ?
    )
    ORDER BY ep.created_at DESC
  `;

  db.query(sql, [userId, userId], (err, results) => {
    if (err) {
      console.error('获取蛋池列表失败:', err);
      return res.status(500).json({ status: 'error', message: '获取蛋池列表失败' });
    }

    res.json({
      status: 'success',
      data: results
    });
  });
});

// 3. 邀请用户加入蛋池（通过 username）
app.post('/api/pools/:id/invite', authMiddleware, (req, res) => {
  const poolId = parseInt(req.params.id);
  const { username } = req.body;
  const currentUserId = req.user.userId;

  if (!username || username.trim().length === 0) {
    return res.status(400).json({ status: 'error', message: '用户名不能为空' });
  }

  // 检查当前用户是否是蛋池成员（只有成员才能邀请）
  const checkMembershipSql = 'SELECT * FROM pool_members WHERE pool_id = ? AND user_id = ?';
  db.query(checkMembershipSql, [poolId, currentUserId], (err, memberResults) => {
    if (err) {
      console.error('检查成员身份失败:', err);
      return res.status(500).json({ status: 'error', message: '服务器错误' });
    }

    if (memberResults.length === 0) {
      return res.status(403).json({ status: 'error', message: '您不是该蛋池的成员，无法邀请他人' });
    }

    // 根据 username 查询用户
    const findUserSql = 'SELECT id, username FROM users WHERE username = ?';
    db.query(findUserSql, [username.trim()], (err, userResults) => {
      if (err) {
        console.error('查询用户失败:', err);
        return res.status(500).json({ status: 'error', message: '服务器错误' });
      }

      if (userResults.length === 0) {
        return res.status(404).json({ status: 'error', message: '用户不存在' });
      }

      const targetUserId = userResults[0].id;
      const targetUsername = userResults[0].username;

      // 检查是否已经是成员
      const checkExistingSql = 'SELECT * FROM pool_members WHERE pool_id = ? AND user_id = ?';
      db.query(checkExistingSql, [poolId, targetUserId], (err, existingResults) => {
        if (err) {
          console.error('检查现有成员失败:', err);
          return res.status(500).json({ status: 'error', message: '服务器错误' });
        }

        if (existingResults.length > 0) {
          return res.status(409).json({ status: 'error', message: '该用户已是蛋池成员' });
        }

        // 添加到 pool_members
        const addMemberSql = 'INSERT INTO pool_members (pool_id, user_id) VALUES (?, ?)';
        db.query(addMemberSql, [poolId, targetUserId], (err) => {
          if (err) {
            console.error('添加成员失败:', err);
            return res.status(500).json({ status: 'error', message: '添加成员失败' });
          }

          res.json({
            status: 'success',
            message: `已成功邀请 ${targetUsername} 加入蛋池`,
            data: {
              pool_id: poolId,
              user_id: targetUserId,
              username: targetUsername
            }
          });
        });
      });
    });
  });
});

// 4. 获取蛋池成员列表
app.get('/api/pools/:id/members', authMiddleware, (req, res) => {
  const poolId = parseInt(req.params.id);
  const userId = req.user.userId;

  // 检查用户是否有权查看该蛋池
  const checkAccessSql = `
    SELECT ep.* FROM egg_pools ep
    LEFT JOIN pool_members pm ON ep.id = pm.pool_id AND pm.user_id = ?
    WHERE ep.id = ? AND (ep.type = 'public' OR pm.user_id IS NOT NULL)
  `;
  db.query(checkAccessSql, [userId, poolId], (err, poolResults) => {
    if (err) {
      console.error('检查蛋池访问权限失败:', err);
      return res.status(500).json({ status: 'error', message: '服务器错误' });
    }

    if (poolResults.length === 0) {
      return res.status(403).json({ status: 'error', message: '无权访问该蛋池' });
    }

    // 获取成员列表
    const membersSql = `
      SELECT
        u.id,
        u.username,
        u.avatar,
        pm.joined_at,
        (ep.owner_id = u.id) as is_owner
      FROM pool_members pm
      JOIN users u ON pm.user_id = u.id
      JOIN egg_pools ep ON pm.pool_id = ep.id
      WHERE pm.pool_id = ?
      ORDER BY pm.joined_at ASC
    `;
    db.query(membersSql, [poolId], (err, results) => {
      if (err) {
        console.error('获取成员列表失败:', err);
        return res.status(500).json({ status: 'error', message: '获取成员列表失败' });
      }

      res.json({
        status: 'success',
        data: results
      });
    });
  });
});

// 5. 离开蛋池
app.delete('/api/pools/:id/members', authMiddleware, (req, res) => {
  const poolId = parseInt(req.params.id);
  const userId = req.user.userId;

  // 检查是否是创建者，创建者不能离开（只能删除蛋池）
  const checkOwnerSql = 'SELECT owner_id FROM egg_pools WHERE id = ?';
  db.query(checkOwnerSql, [poolId], (err, results) => {
    if (err) {
      console.error('检查蛋池所有者失败:', err);
      return res.status(500).json({ status: 'error', message: '服务器错误' });
    }

    if (results.length === 0) {
      return res.status(404).json({ status: 'error', message: '蛋池不存在' });
    }

    if (results[0].owner_id === userId) {
      return res.status(403).json({ status: 'error', message: '创建者无法离开蛋池，请删除蛋池' });
    }

    // 删除成员记录
    const deleteSql = 'DELETE FROM pool_members WHERE pool_id = ? AND user_id = ?';
    db.query(deleteSql, [poolId, userId], (err, result) => {
      if (err) {
        console.error('离开蛋池失败:', err);
        return res.status(500).json({ status: 'error', message: '离开蛋池失败' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ status: 'error', message: '您不是该蛋池的成员' });
      }

      res.json({
        status: 'success',
        message: '已成功离开蛋池'
      });
    });
  });
});

// ========== 蛋相关接口 ==========

// 3. 获取蛋列表接口（支持按蛋池筛选，带权限校验）
app.get('/api/get-eggs', authMiddleware, (req, res) => {
  const userId = req.user.userId;
  const poolId = req.query.pool_id ? parseInt(req.query.pool_id) : null;

  let sql;
  let params = [];

  if (poolId) {
    // 查询指定蛋池的蛋，需要权限校验
    sql = `
      SELECT 
        e.*, 
        TIMESTAMPDIFF(HOUR, e.created_at, NOW()) as hours_age,
        ep.type as pool_type,
        (ep.owner_id = ?) as is_pool_owner
      FROM eggs e
      JOIN egg_pools ep ON e.pool_id = ep.id
      LEFT JOIN pool_members pm ON ep.id = pm.pool_id AND pm.user_id = ?
      WHERE e.pool_id = ? AND (ep.type = 'public' OR pm.user_id IS NOT NULL)
    `;
    params = [userId, userId, poolId];
  } else {
    // 默认查询用户是成员的所有蛋池（包括 public 和 private）中的蛋
    sql = `
      SELECT 
        e.*, 
        TIMESTAMPDIFF(HOUR, e.created_at, NOW()) as hours_age,
        ep.name as pool_name,
        ep.type as pool_type
      FROM eggs e
      JOIN egg_pools ep ON e.pool_id = ep.id
      WHERE ep.type = 'public'
      OR ep.id IN (SELECT pool_id FROM pool_members WHERE user_id = ?)
    `;
    params = [userId];
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('获取蛋列表失败:', err);
      return res.status(500).json({ status: 'error', message: '获取蛋列表失败' });
    }

    // 在后端直接计算好状态标签和颜色
    const enhancedResults = results.map(egg => {
      const days = egg.hours_age / 24;
      let status = '新鲜';
      let displayColor = '#FFFFFF'; // 默认白色

      if (days >= 5) {
        status = '臭了！';
        displayColor = '#2B2B2B'; // 发黑臭
      } else if (days >= 4) {
        status = '变质';
        displayColor = '#4E7C3E'; // 绿了
      } else if (days >= 3) {
        status = '不新鲜';
        displayColor = '#A2AD4A'; // 黄绿色
      } else if (days >= 2) {
        status = '正常';
        displayColor = '#FFD700'; // 黄色
      } else {
        status = '新鲜';
        displayColor = '#FFFFFF'; // 一天内白色
      }

      return { ...egg, status, displayColor };
    });

    res.json(enhancedResults);
  });
});

// 4. 新增蛋的接口 (需要认证，必须指定 pool_id)
app.post('/api/add-egg', authMiddleware, (req, res) => {
  const { name, color, pos_x, pos_y, pos_z, pool_id } = req.body;
  const userId = req.user.userId;

  // 检查 pool_id 是否提供
  if (!pool_id) {
    return res.status(400).json({ status: 'error', message: '必须指定蛋池 ID (pool_id)' });
  }

  const poolIdInt = parseInt(pool_id);

  // 检查用户是否是该蛋池的成员
  const checkMembershipSql = `
    SELECT ep.* FROM egg_pools ep
    LEFT JOIN pool_members pm ON ep.id = pm.pool_id AND pm.user_id = ?
    WHERE ep.id = ? AND (ep.type = 'public' OR pm.user_id IS NOT NULL)
  `;
  db.query(checkMembershipSql, [userId, poolIdInt], (err, results) => {
    if (err) {
      console.error('检查蛋池成员身份失败:', err);
      return res.status(500).json({ status: 'error', message: '服务器错误' });
    }

    if (results.length === 0) {
      return res.status(403).json({ status: 'error', message: '您无权在该蛋池创建蛋' });
    }

    const sql = 'INSERT INTO eggs (user_id, pool_id, name, color, pos_x, pos_y, pos_z) VALUES (?, ?, ?, ?, ?, ?, ?)';

    db.query(sql, [userId, poolIdInt, name, color, pos_x, pos_y, pos_z], (err, result) => {
      if (err) {
        console.error('创建蛋失败:', err);
        return res.status(500).json({ status: 'error', message: '创建蛋失败' });
      }
      res.json({ status: 'success', id: result.insertId });
    });
  });
});

// 5. 获取单个蛋详情接口 (关联 users 表获取创建者信息，包含人类评分统计，带蛋池权限校验)
app.get('/api/egg/:id', (req, res) => {
  const { id } = req.params;
  const authHeader = req.headers.authorization;
  let currentUserId = null;

  // 解析当前登录用户ID（如果已登录）
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      currentUserId = decoded.userId;
    } catch (error) {
      // Token 无效，继续以未登录状态处理
    }
  }

  console.log('获取蛋详情, id:', id, '当前用户:', currentUserId);

  // 关联 users 表和 egg_pools 表获取创建者信息和蛋池信息
  const sql = `
    SELECT
      e.*,
      u.username as creator_name,
      u.avatar as creator_avatar,
      ep.name as pool_name,
      ep.type as pool_type,
      ep.owner_id as pool_owner_id,
      TIMESTAMPDIFF(HOUR, e.created_at, NOW()) as hours_age
    FROM eggs e
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN egg_pools ep ON e.pool_id = ep.id
    WHERE e.id = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('查询失败:', err);
      return res.status(500).json(err);
    }
    console.log('查询结果:', results);
    if (results.length === 0) {
      return res.status(404).json({ status: 'error', message: '蛋不存在' });
    }

    const egg = results[0];

    // 权限校验：私有池子的蛋只有成员能看
    if (egg.pool_type === 'private' && currentUserId) {
      const checkAccessSql = `
        SELECT 1 FROM pool_members
        WHERE pool_id = ? AND user_id = ?
      `;
      db.query(checkAccessSql, [egg.pool_id, currentUserId], (err, accessResults) => {
        if (err) {
          console.error('检查蛋池访问权限失败:', err);
          return res.status(500).json({ status: 'error', message: '服务器错误' });
        }

        if (accessResults.length === 0) {
          return res.status(403).json({ status: 'error', message: '无权查看该蛋' });
        }

        // 有权限，继续返回详情
        returnEggDetail();
      });
    } else if (egg.pool_type === 'private' && !currentUserId) {
      // 未登录用户无法查看私有池子的蛋
      return res.status(403).json({ status: 'error', message: '请先登录以查看该蛋' });
    } else {
      // 公共池子或无池子的蛋，直接返回
      returnEggDetail();
    }

    function returnEggDetail() {
      // 计算状态
      const days = egg.hours_age / 24;
      let status = '新鲜';
      let displayColor = '#FFFFFF';

      if (days >= 5) {
        status = '臭了！';
        displayColor = '#2B2B2B';
      } else if (days >= 4) {
        status = '变质';
        displayColor = '#4E7C3E';
      } else if (days >= 3) {
        status = '不新鲜';
        displayColor = '#A2AD4A';
      } else       if (days >= 2) {
        status = '正常';
        displayColor = '#FFD700';
      }

      // 查询人类评分统计
      const ratingStatsSql = `
        SELECT
          AVG(score) as avg_score,
          COUNT(*) as rating_count
        FROM egg_ratings
        WHERE egg_id = ?
      `;

      db.query(ratingStatsSql, [id], (err, ratingStats) => {
        if (err) {
          console.error('查询评分统计失败:', err);
          // 不影响主流程，继续返回基本信息
        }

        const avgScore = ratingStats?.[0]?.avg_score;
        const ratingCount = ratingStats?.[0]?.rating_count || 0;

        // 检查当前用户是否已评分
        let userHasRated = false;
        let userRating = null;

        if (currentUserId) {
          const checkUserRatingSql = 'SELECT score FROM egg_ratings WHERE egg_id = ? AND user_id = ?';
          db.query(checkUserRatingSql, [id, currentUserId], (err, userRatingResult) => {
            if (!err && userRatingResult.length > 0) {
              userHasRated = true;
              userRating = userRatingResult[0].score;
            }

            res.json({
              status: 'success',
              data: {
                ...egg,
                status,
                displayColor,
                human_score_avg: avgScore ? parseFloat(avgScore).toFixed(1) : null,
                human_rating_count: ratingCount,
                user_has_rated: userHasRated,
                user_rating: userRating
              }
            });
          });
        } else {
          // 未登录用户
          res.json({
            status: 'success',
            data: {
              ...egg,
              status,
              displayColor,
              human_score_avg: avgScore ? parseFloat(avgScore).toFixed(1) : null,
              human_rating_count: ratingCount,
              user_has_rated: false,
              user_rating: null
            }
          });
        }
      });
    }
  });
});

// 6. 删除蛋接口 (打碎蛋时调用，需要认证，只能删除自己的蛋)
app.delete('/api/egg/:id', authMiddleware, (req, res) => {
  const id = parseInt(req.params.id);
  const userId = req.user.userId;
  console.log('🔥🔥 准备删除的 ID 是:', id, '用户ID:', userId);

  // 先检查是否是创建者
  const checkSql = 'SELECT user_id FROM eggs WHERE id = ?';
  db.query(checkSql, [id], (err, results) => {
    if (err) return res.status(500).json(err);
    
    if (results.length === 0) {
      return res.status(404).json({ status: 'error', message: '蛋不存在' });
    }
    
    // 如果不是创建者，不允许删除
    if (results[0].user_id !== userId) {
      return res.status(403).json({ status: 'error', message: '无权删除此蛋' });
    }

    const sql = 'DELETE FROM eggs WHERE id = ?';
    db.query(sql, [id], (err, result) => {
      if (err) return res.status(500).json(err);
      
      console.log('数据库删除结果:', result);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ status: 'error', message: '数据库里找不到这个蛋' });
      }
      res.json({ status: 'success', message: '蛋已从数据库消失' });
    });
  });
});

// ========== 评论相关接口 ==========

// 添加评论
app.post('/api/egg/:id/comment', authMiddleware, (req, res) => {
  const eggId = parseInt(req.params.id);
  const userId = req.user.userId;
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ status: 'error', message: '评论内容不能为空' });
  }

  // 检查蛋是否存在
  const checkEggSql = 'SELECT id FROM eggs WHERE id = ?';
  db.query(checkEggSql, [eggId], (err, results) => {
    if (err) return res.status(500).json(err);
    if (results.length === 0) {
      return res.status(404).json({ status: 'error', message: '蛋不存在' });
    }

    // 插入评论
    const sql = 'INSERT INTO comments (egg_id, user_id, content) VALUES (?, ?, ?)';
    db.query(sql, [eggId, userId, content.trim()], (err, result) => {
      if (err) {
        console.error('添加评论失败:', err);
        return res.status(500).json({ status: 'error', message: '添加评论失败' });
      }

      res.json({
        status: 'success',
        message: '评论添加成功',
        commentId: result.insertId
      });
    });
  });
});

// 获取蛋的所有评论
app.get('/api/egg/:id/comments', (req, res) => {
  const eggId = parseInt(req.params.id);

  const sql = `
    SELECT 
      c.id,
      c.content,
      c.created_at,
      u.id as user_id,
      u.username,
      u.avatar
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.egg_id = ?
    ORDER BY c.created_at ASC
  `;

  db.query(sql, [eggId], (err, results) => {
    if (err) {
      console.error('获取评论失败:', err);
      return res.status(500).json({ status: 'error', message: '获取评论失败' });
    }

    res.json({
      status: 'success',
      data: results
    });
  });
});

// 删除评论（需要认证，只能删除自己的评论）
app.delete('/api/comment/:id', authMiddleware, (req, res) => {
  const commentId = parseInt(req.params.id);
  const userId = req.user.userId;

  // 先检查是否是评论作者
  const checkSql = 'SELECT user_id FROM comments WHERE id = ?';
  db.query(checkSql, [commentId], (err, results) => {
    if (err) {
      console.error('检查评论失败:', err);
      return res.status(500).json({ status: 'error', message: '数据库错误' });
    }

    if (results.length === 0) {
      return res.status(404).json({ status: 'error', message: '评论不存在' });
    }

    // 如果不是评论作者，不允许删除
    if (results[0].user_id !== userId) {
      return res.status(403).json({ status: 'error', message: '无权删除此评论' });
    }

    // 删除评论
    const deleteSql = 'DELETE FROM comments WHERE id = ?';
    db.query(deleteSql, [commentId], (err, result) => {
      if (err) {
        console.error('删除评论失败:', err);
        return res.status(500).json({ status: 'error', message: '删除评论失败' });
      }

      res.json({
        status: 'success',
        message: '评论删除成功'
      });
    });
  });
});

// ========== 人类评分相关接口 ==========

// 对蛋进行评分（需要认证）
app.post('/api/eggs/:id/rate', authMiddleware, (req, res) => {
  const eggId = parseInt(req.params.id);
  const userId = req.user.userId;
  const { score } = req.body;

  // 校验评分参数
  if (score === undefined || score === null) {
    return res.status(400).json({ status: 'error', message: '评分分数不能为空' });
  }

  const scoreNum = parseInt(score);
  if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 5) {
    return res.status(400).json({ status: 'error', message: '评分必须在 1-5 分之间' });
  }

  // 检查蛋是否存在，并获取创建者信息
  const checkEggSql = 'SELECT id, user_id FROM eggs WHERE id = ?';
  db.query(checkEggSql, [eggId], (err, eggResults) => {
    if (err) {
      console.error('检查蛋失败:', err);
      return res.status(500).json({ status: 'error', message: '数据库错误' });
    }

    if (eggResults.length === 0) {
      return res.status(404).json({ status: 'error', message: '蛋不存在' });
    }

    const egg = eggResults[0];

    // 校验：用户不能给自己的蛋评分
    if (egg.user_id === userId) {
      return res.status(403).json({ status: 'error', message: '不能给自己的作品评分' });
    }

    // 校验：用户之前没有评过分
    const checkExistingRatingSql = 'SELECT id FROM egg_ratings WHERE egg_id = ? AND user_id = ?';
    db.query(checkExistingRatingSql, [eggId, userId], (err, existingResults) => {
      if (err) {
        console.error('检查已有评分失败:', err);
        return res.status(500).json({ status: 'error', message: '数据库错误' });
      }

      if (existingResults.length > 0) {
        return res.status(409).json({ status: 'error', message: '您已经对此作品评分过了' });
      }

      // 插入评分
      const insertSql = 'INSERT INTO egg_ratings (egg_id, user_id, score) VALUES (?, ?, ?)';
      db.query(insertSql, [eggId, userId, scoreNum], (err, result) => {
        if (err) {
          console.error('添加评分失败:', err);
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ status: 'error', message: '您已经对此作品评分过了' });
          }
          return res.status(500).json({ status: 'error', message: '评分失败' });
        }

        // 查询最新的评分统计
        const statsSql = `
          SELECT 
            AVG(score) as avg_score,
            COUNT(*) as rating_count
          FROM egg_ratings
          WHERE egg_id = ?
        `;
        
        db.query(statsSql, [eggId], (err, stats) => {
          const avgScore = stats?.[0]?.avg_score;
          const ratingCount = stats?.[0]?.rating_count || 0;

          res.json({
            status: 'success',
            message: '评分成功',
            data: {
              ratingId: result.insertId,
              score: scoreNum,
              human_score_avg: avgScore ? parseFloat(avgScore).toFixed(1) : scoreNum.toFixed(1),
              human_rating_count: ratingCount
            }
          });
        });
      });
    });
  });
});

// ========== 头像上传接口 ==========

// 上传头像接口
app.post('/api/user/upload-avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: '请选择要上传的图片' });
    }

    const userId = req.user.userId;
    const inputPath = req.file.path;
    const filename = 'avatar-' + userId + '-' + Date.now() + '.png';
    const outputPath = path.join(uploadDir, filename);

    // 使用 sharp 压缩并调整图片大小
    await sharp(inputPath)
      .resize(200, 200, { fit: 'cover', position: 'center' })
      .png({ quality: 90 })
      .toFile(outputPath);

    // 删除原始文件
    fs.unlinkSync(inputPath);

    // 获取旧头像路径（用于删除）
    const [oldUser] = await new Promise((resolve, reject) => {
      db.query('SELECT avatar FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });

    // 更新数据库中的头像路径
    const avatarUrl = `/uploads/avatars/${filename}`;
    const sql = 'UPDATE users SET avatar = ? WHERE id = ?';

    db.query(sql, [avatarUrl, userId], (err) => {
      if (err) {
        console.error('更新头像失败:', err);
        // 删除已上传的文件
        fs.unlinkSync(outputPath);
        return res.status(500).json({ status: 'error', message: '更新头像失败' });
      }

      // 删除旧头像文件（如果不是默认头像）
      if (oldUser?.avatar && !oldUser.avatar.includes('default')) {
        const oldPath = path.join(__dirname, 'public', oldUser.avatar);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      res.json({
        status: 'success',
        message: '头像上传成功',
        avatarUrl: avatarUrl
      });
    });

  } catch (error) {
    console.error('上传头像失败:', error);
    // 清理临时文件
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ status: 'error', message: '上传失败: ' + error.message });
  }
});

// 获取默认头像
app.get('/uploads/avatars/default.png', (req, res) => {
  // 生成默认头像（使用 SVG）
  const defaultAvatarSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#00c8ff;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0096ff;stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="100" fill="url(#grad)"/>
      <text x="100" y="130" font-family="Arial, sans-serif" font-size="80" font-weight="bold" fill="white" text-anchor="middle">U</text>
    </svg>
  `;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(defaultAvatarSvg);
});

// 错误处理中间件
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ status: 'error', message: '文件大小不能超过 5MB' });
    }
  }
  res.status(500).json({ status: 'error', message: error.message });
});

app.listen(3000, () => {
  console.log('🚀 后端服务已启动: http://localhost:3000');
});