const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir); }

const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, uploadDir); },
    filename: function (req, file, cb) {
        const safeName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, Date.now() + '-' + safeName);
    }
});
const upload = multer({ storage: storage });
app.use('/uploads', express.static(uploadDir));

// ĐÃ KHÔI PHỤC API NHẬN FILE (SỬA LỖI 404)
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Không tìm thấy file' });
    res.json({ filePath: `/uploads/${req.file.filename}`, fileName: req.file.originalname });
});

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error('Lỗi DB:', err.message);
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, role TEXT, password TEXT, is_active INTEGER DEFAULT 1, department_id TEXT, report_access INTEGER DEFAULT 0)`);
    db.run(`CREATE TABLE IF NOT EXISTS departments (id TEXT PRIMARY KEY, name TEXT, categories_json TEXT DEFAULT '[]')`);
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, creator_id TEXT, assignees_json TEXT,
        start_date TEXT, due_date TEXT, status TEXT, additional_data TEXT, target_amount REAL DEFAULT 0,
        target_unit TEXT, current_amount REAL DEFAULT 0, progress_percent INTEGER DEFAULT 0,
        manpower_json TEXT, fault_dept TEXT, fault_reason TEXT, history_log TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, period_type TEXT, file_path TEXT, file_name TEXT, created_by TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);

    const addCol = (table, col, type) => db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`, (err) => {});
    addCol('users', 'department_id', 'TEXT');
    addCol('users', 'report_access', 'INTEGER DEFAULT 0');
    addCol('tasks', 'fault_dept', 'TEXT');
    addCol('tasks', 'fault_reason', 'TEXT');
    addCol('tasks', 'history_log', 'TEXT');
    addCol('departments', 'categories_json', "TEXT DEFAULT '[]'");

    db.get("SELECT COUNT(*) AS count FROM users WHERE id='admin'", (err, row) => {
        if (!err && row && row.count === 0) {
            db.run("INSERT INTO users (id, name, role, password, is_active, report_access) VALUES ('admin', 'Quản trị Hệ thống', 'admin', 'admin123', 1, 1)");
        }
    });
});

app.get('/api/settings', (req, res) => { db.all("SELECT key, value FROM settings", (err, rows) => { const settings = { unit_name: 'HỆ THỐNG TÁC NGHIỆP', logo_url: '', custom_fields: [], task_categories: [] }; (rows || []).forEach(r => { if (r.key === 'unit_name') settings.unit_name = r.value; if (r.key === 'logo_url') settings.logo_url = r.value; if (r.key === 'custom_fields') { try { settings.custom_fields = JSON.parse(r.value); } catch(e){} } if (r.key === 'task_categories') { try { settings.task_categories = JSON.parse(r.value); } catch(e){} } }); res.json(settings); }); });
app.put('/api/admin/settings', (req, res) => {
    const { unit_name, logo_url, custom_fields, task_categories } = req.body;
    const settingsToSave = { unit_name, logo_url, custom_fields, task_categories };
    const entries = Object.entries(settingsToSave).filter(([, value]) => value !== undefined);
    db.serialize(() => {
        const saveNext = (index) => {
            if (index >= entries.length) return res.json({ success: true });
            const [key, value] = entries[index];
            const storedValue = typeof value === 'string' ? value : JSON.stringify(value);
            db.run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, storedValue], (err) => {
                if (err) return res.status(500).json({ error: 'Không thể lưu cài đặt hệ thống.' });
                saveNext(index + 1);
            });
        };
        saveNext(0);
    });
});

app.get('/api/departments', (req, res) => { db.all("SELECT * FROM departments", [], (err, rows) => { const depts = rows.map(r => ({...r, categories: JSON.parse(r.categories_json || '[]')})); res.json(depts); }); });
app.post('/api/departments', (req, res) => { db.run("INSERT INTO departments (id, name, categories_json) VALUES (?, ?, '[]')", [req.body.id, req.body.name], function(err) { if (err) return res.status(400).json({error: "ID phòng ban tồn tại"}); res.json({success: true}); }); });
app.put('/api/departments/:id/categories', (req, res) => { db.run("UPDATE departments SET categories_json = ? WHERE id = ?", [JSON.stringify(req.body.categories), req.params.id], () => res.json({success: true})); });
app.delete('/api/departments/:id', (req, res) => { db.run("DELETE FROM departments WHERE id = ?", [req.params.id], () => res.json({success: true})); });

app.post('/api/login', (req, res) => { db.get("SELECT id, name, role, is_active, department_id, report_access FROM users WHERE id = ? AND password = ?", [req.body.id, req.body.password], (err, user) => { if (!user) return res.status(401).json({ error: "Sai thông tin!" }); if (user.is_active === 0) return res.status(403).json({ error: "Tài khoản bị khóa!" }); res.json(user); }); });
app.put('/api/change-password', (req, res) => {
    const { id, old_password, new_password } = req.body;
    if (!id || !old_password || !new_password) return res.status(400).json({ error: 'Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới.' });
    if (new_password.length < 6) return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    db.get("SELECT password FROM users WHERE id = ?", [id], (err, user) => {
        if (err) return res.status(500).json({ error: 'Không thể kiểm tra tài khoản lúc này.' });
        if (!user || user.password !== old_password) return res.status(400).json({ error: 'Mật khẩu cũ không đúng!' });
        db.run("UPDATE users SET password = ? WHERE id = ?", [new_password, id], function(updateErr) {
            if (updateErr) return res.status(500).json({ error: 'Không thể cập nhật mật khẩu lúc này.' });
            if (!this.changes) return res.status(404).json({ error: 'Không tìm thấy tài khoản.' });
            res.json({ success: true });
        });
    });
});
app.get('/api/admin/users', (req, res) => { db.all("SELECT * FROM users WHERE id != 'admin'", [], (err, rows) => res.json(rows)); });
app.get('/api/users', (req, res) => { db.all("SELECT id, name, role, department_id FROM users WHERE is_active = 1 AND id != 'admin'", [], (err, rows) => res.json(rows || [])); });
app.post('/api/admin/users', (req, res) => { db.run("INSERT INTO users (id, name, role, password, is_active, department_id) VALUES (?, ?, ?, ?, 1, ?)", [req.body.id, req.body.name, req.body.role, req.body.password, req.body.department_id], function(err) { if (err) return res.status(400).json({ error: "ID tồn tại!" }); res.json({ success: true }); }); });
app.put('/api/admin/users/:id/password', (req, res) => { db.run("UPDATE users SET password = ? WHERE id = ?", [req.body.password, req.params.id], () => res.json({ success: true })); });
app.put('/api/admin/users/:id/toggle', (req, res) => { db.run("UPDATE users SET is_active = ? WHERE id = ?", [req.body.is_active, req.params.id], () => res.json({ success: true })); });

app.get('/api/tasks', (req, res) => {
    db.all("SELECT * FROM tasks", [], (err, tasks) => {
        if (err) return res.json([]);
        const parsedTasks = tasks.map(t => ({ 
            ...t, assignees: JSON.parse(t.assignees_json || "[]"), additional_data: JSON.parse(t.additional_data || "{}"), manpower: JSON.parse(t.manpower_json || "[]"), history_log: JSON.parse(t.history_log || "[]")
        }));
        res.json(parsedTasks);
    });
});

app.post('/api/tasks', (req, res) => {
    const { id, title, creator_id, assignees, start_date, due_date, status, additional_data, target_amount, target_unit, current_amount, progress_percent, manpower, fault_dept, fault_reason, current_user_name, update_details } = req.body;
    const taskStatus = status || 'pending';
    const nowStr = new Date().toLocaleString('vi-VN');

    if (id) {
        db.get("SELECT * FROM tasks WHERE id = ?", [id], (err, oldTask) => {
            let logs = []; try { logs = JSON.parse(oldTask.history_log || "[]"); } catch(e){}
            let changes = [];
            if(oldTask.title !== title) changes.push(`Sửa tên: [${oldTask.title}] -> [${title}]`);
            if(oldTask.progress_percent !== progress_percent) changes.push(`Tiến độ: ${oldTask.progress_percent}% -> ${progress_percent}%`);
            if(oldTask.current_amount !== current_amount) changes.push(`Kết quả: ${oldTask.current_amount} -> ${current_amount} ${target_unit}`);
            if(oldTask.fault_dept !== fault_dept || oldTask.fault_reason !== fault_reason) changes.push(`Cập nhật Trách nhiệm chậm trễ`);
            if(update_details) changes.push(update_details); 

            if (changes.length > 0) { logs.unshift({ time: nowStr, user: current_user_name, action: 'Cập nhật', details: changes.join(' | ') }); }

            db.run("UPDATE tasks SET title=?, assignees_json=?, start_date=?, due_date=?, status=?, additional_data=?, target_amount=?, target_unit=?, current_amount=?, progress_percent=?, manpower_json=?, fault_dept=?, fault_reason=?, history_log=? WHERE id=?", 
                [title, JSON.stringify(assignees||[]), start_date, due_date, taskStatus, JSON.stringify(additional_data||{}), target_amount, target_unit, current_amount, progress_percent, JSON.stringify(manpower||[]), fault_dept, fault_reason, JSON.stringify(logs), id], () => res.json({ success: true }));
        });
    } else {
        const initialLog = [{ time: nowStr, user: current_user_name, action: 'Tạo mới', details: 'Khởi tạo nhiệm vụ' }];
        db.run("INSERT INTO tasks (title, creator_id, assignees_json, start_date, due_date, status, additional_data, target_amount, target_unit, current_amount, progress_percent, manpower_json, fault_dept, fault_reason, history_log) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
            [title, creator_id, JSON.stringify(assignees||[]), start_date, due_date, taskStatus, JSON.stringify(additional_data||{}), target_amount, target_unit, current_amount, progress_percent, JSON.stringify(manpower||[]), fault_dept, fault_reason, JSON.stringify(initialLog)], function() { res.json({ success: true, id: this.lastID }); });
    }
});
// Tính năng xóa nhiệm vụ dành cho Admin
app.delete('/api/tasks/:id', (req, res) => {
  db.run("DELETE FROM tasks WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, changes: this.changes });
  });
});
app.get('/api/reports', (req, res) => { db.all("SELECT * FROM reports ORDER BY created_at DESC", [], (err, rows) => res.json(rows || [])); });
app.post('/api/reports', (req, res) => {
    const { title, period_type, file_path, file_name, created_by } = req.body;
    db.get("SELECT id FROM reports WHERE title = ?", [title], (err, existing) => {
        if (existing) { db.run("UPDATE reports SET period_type=?, file_path=?, file_name=?, created_by=?, created_at=CURRENT_TIMESTAMP WHERE id=?", [period_type, file_path, file_name, created_by, existing.id], () => res.json({ success: true })); } 
        else { db.run("INSERT INTO reports (title, period_type, file_path, file_name, created_by) VALUES (?, ?, ?, ?, ?)", [title, period_type, file_path, file_name, created_by], () => res.json({ success: true })); }
    });
});
app.delete('/api/reports/:id', (req, res) => { db.run("DELETE FROM reports WHERE id = ?", [req.params.id], () => res.json({ success: true })); });

app.listen(3001, '0.0.0.0', () => console.log(`🚀 MÁY CHỦ ĐÃ CHẠY TẠI CỔNG 3001`));
