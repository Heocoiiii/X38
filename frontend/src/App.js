import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Clock, CheckCircle, AlertTriangle, LogOut, Plus, Edit, Shield, Calendar, Users, FileText, Settings, Lock, Unlock, Key, Save, Trash2, Layers, BarChart2, Paperclip, Eye, Edit2, X, Check, FileBarChart, UploadCloud, Download, Target, Folder, History, UserPlus, Home, UserCheck, MonitorPlay, Maximize, PieChart, TrendingUp, Image } from 'lucide-react';

const API_URL = 'http://localhost:3001/api';
const SERVER_URL = 'http://localhost:3001'; 

// Nhiệm vụ thường xuyên (Nhập rau / Tăng gia): tính cả năm, không có hạn chót, không tính chậm/khuyết điểm
const isRoutine = (t) => !!t?.additional_data?.is_farming;

function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [activeTab, setActiveTab] = useState('tasks_mine'); 
  const [adminUsers, setAdminUsers] = useState([]);
  
  const [systemName, setSystemName] = useState('HỆ THỐNG TÁC NGHIỆM');
  const [editSystemName, setEditSystemName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  
  const [customFields, setCustomFields] = useState([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [editingFieldText, setEditingFieldText] = useState('');
  
  const [newDeptId, setNewDeptId] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [editingDeptCatsId, setEditingDeptCatsId] = useState(null);
  
  const [taskCategories, setTaskCategories] = useState([]); 
  const [newCategoryName, setNewCategoryName] = useState('');
  const [subCategoryInputs, setSubCategoryInputs] = useState({});
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatText, setEditingCatText] = useState('');
  const [editingSubId, setEditingSubId] = useState(null);
  const [editingSubText, setEditingSubText] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null); 
  const [showPassModal, setShowPassModal] = useState(false);
  const [passData, setPassData] = useState({ old: '', new: '', confirm: '' });
  
  const [meetingFilter, setMeetingFilter] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1, week: '1', view_mode: 'week' });

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);
  const [uploadReportFilter, setUploadReportFilter] = useState({ year: currentYear, quarter: currentQuarter, month: currentMonth, week: '1', view_mode: 'week' });
  const [uploadReportFile, setUploadReportFile] = useState(null);
  
  const [draftFilterObj, setDraftFilterObj] = useState({ year: currentYear, quarter: currentQuarter, month: currentMonth, week: '1', view_mode: 'week' });
  const [emulationFilter, setEmulationFilter] = useState({ year: currentYear, quarter: currentQuarter, month: currentMonth, week: 'month' });
  const [emulationSelectedDept, setEmulationSelectedDept] = useState(''); 
  const [participatingDepts, setParticipatingDepts] = useState([]); 
  const [ratingTask, setRatingTask] = useState(null);
  const [ratingData, setRatingData] = useState({ points: 0, reason: '' });
  
  const [farmingTargets, setFarmingTargets] = useState({});
  const [editingFarmingTargets, setEditingFarmingTargets] = useState(false);
  const [selectedTargetPeriod, setSelectedTargetPeriod] = useState('Q1');

  useEffect(() => {
      if (departments.length > 0 && participatingDepts.length === 0) {
          setParticipatingDepts(departments.filter(d => !d.name.toLowerCase().includes('giám đốc') && !d.name.toLowerCase().includes('gđ')).map(d => d.id));
      }
  }, [departments, participatingDepts.length]);

  const handleSaveRating = async (e) => {
      e.preventDefault();
      if (user.role !== 'admin') return alert('Chỉ tài khoản admin mới được chỉnh sửa điểm thi đua.');

      const pts = parseFloat(ratingData.points) || 0;
      const updatedData = { ...ratingTask.additional_data, bonus_pts: pts > 0 ? pts : 0, bonus_reason: pts > 0 ? ratingData.reason : '', penalty_pts: pts < 0 ? Math.abs(pts) : 0, penalty_reason: pts < 0 ? ratingData.reason : '' };
      await axios.post(`${API_URL}/tasks`, { ...ratingTask, additional_data: updatedData });
      setRatingTask(null); fetchData(user);
  };

  const [formData, setFormData] = useState({ 
    title: '', start_date: '', due_date: '', assignees: [], 
    additional_data: { note: '', category: '', sub_category: '', attached_file: '', attached_file_name: '', completed_at: null, directing_dept: '', bonus_dept: '', bonus_pts: 0, bonus_reason: '', penalty_dept: '', penalty_pts: 0, penalty_reason: '', is_farming: false, farming_stats: {} },
    target_amount: 0, target_unit: '', current_amount: 0, progress_percent: 0, manpower: [], fault_dept: '', fault_reason: ''
  });

  const [newUserForm, setNewUserForm] = useState({ id: '', name: '', role: 'staff', password: '', department_id: '' });
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');

  useEffect(() => { fetchSystemSettings(); }, []);

  const fetchSystemSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/settings`);
      setSystemName(res.data.unit_name.toUpperCase());
      setEditSystemName(res.data.unit_name.toUpperCase());
      setLogoUrl(res.data.logo_url || '');
      setEditLogoUrl(res.data.logo_url || '');
      setCustomFields(res.data.custom_fields || []);
      setTaskCategories(res.data.task_categories || []);
    } catch (err) {}
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/login`, { id: loginId, password: loginPass });
      setUser(res.data); fetchData(res.data); fetchReports();
    } catch (err) { alert(err.response?.data?.error || 'Lỗi đăng nhập'); }
  };

  const fetchData = async (currentUser) => {
    try {
      const taskRes = await axios.get(`${API_URL}/tasks`); setTasks(taskRes.data);
      const deptRes = await axios.get(`${API_URL}/departments`); setDepartments(deptRes.data);
      const userListRes = await axios.get(`${API_URL}/users`); setAllUsers(userListRes.data);
      if (currentUser.role === 'admin') { fetchAdminUsers(); }
    } catch (err) {}
  };
  const fetchAdminUsers = async () => { try { const res = await axios.get(`${API_URL}/admin/users`); setAdminUsers(res.data); } catch (err) { console.error(err); } };
  const fetchReports = async () => { try { const res = await axios.get(`${API_URL}/reports`); setReports(res.data); } catch(err){} };

  // Đổi mật khẩu cá nhân chuẩn xác
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passData.old || !passData.new || !passData.confirm) return alert('Vui lòng nhập đầy đủ các trường mật khẩu.');
    if (passData.new.length < 6) return alert('Mật khẩu mới phải có ít nhất 6 ký tự.');
    if (passData.new !== passData.confirm) {
      return alert("Mật khẩu mới và Nhập lại mật khẩu không trùng khớp!");
    }
    try { 
      await axios.put(`${API_URL}/change-password`, { id: user.id, old_password: passData.old, new_password: passData.new }); 
      alert("Đổi mật khẩu thành công!"); 
      setShowPassModal(false); 
      setPassData({ old: '', new: '', confirm: '' }); 
    } catch(err) { 
      alert(err.response?.data?.error || "Đổi mật khẩu thất bại, vui lòng kiểm tra lại mật khẩu cũ!"); 
    }
  };

  const handleUpdateSystemName = async (e) => { 
    e.preventDefault(); 
    try {
      await axios.put(`${API_URL}/admin/settings`, { unit_name: editSystemName, logo_url: editLogoUrl }); 
      setSystemName(editSystemName.toUpperCase()); 
      setLogoUrl(editLogoUrl);
      alert('Đã cập nhật Tên đơn vị và Logo hệ thống!');
    } catch (err) {
      alert(err.response?.data?.error || 'Không thể lưu cài đặt hệ thống.');
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fileData = new FormData();
    fileData.append('file', file);
    try {
      const res = await axios.post(`${API_URL}/upload`, fileData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const fullLogoPath = `${SERVER_URL}${res.data.filePath}`;
      setEditLogoUrl(fullLogoPath);
      alert("Tải Logo lên thành công! Hãy bấm 'Lưu Cài Đặt' để áp dụng.");
    } catch(err) {
      alert("Tải logo thất bại!");
    }
  };

  const handleAddCustomField = async (e) => { e.preventDefault(); if(!newFieldName.trim()) return; const newFields = [...customFields, { id: 'field_' + Date.now(), label: newFieldName }]; await axios.put(`${API_URL}/admin/settings`, { custom_fields: newFields }); setCustomFields(newFields); setNewFieldName(''); };
  const handleRemoveCustomField = async (id) => { if(!window.confirm('Xóa trường dữ liệu này?')) return; const newFields = customFields.filter(f => f.id !== id); await axios.put(`${API_URL}/admin/settings`, { custom_fields: newFields }); setCustomFields(newFields); };
  const startEditField = (field) => { setEditingFieldId(field.id); setEditingFieldText(field.label); };
  const cancelEditField = () => { setEditingFieldId(null); setEditingFieldText(''); };
  const saveEditField = async (id) => { if(!editingFieldText.trim()) return cancelEditField(); const newFields = customFields.map(f => f.id === id ? { ...f, label: editingFieldText } : f); await axios.put(`${API_URL}/admin/settings`, { custom_fields: newFields }); setCustomFields(newFields); setEditingFieldId(null); };

  const saveCategories = async (newCats) => { await axios.put(`${API_URL}/admin/settings`, { task_categories: newCats }); setTaskCategories(newCats); };
  const handleAddCategory = async (e) => { e.preventDefault(); if(!newCategoryName.trim()) return; await saveCategories([...taskCategories, { id: 'cat_' + Date.now(), name: newCategoryName, subCategories: [] }]); setNewCategoryName(''); };
  const handleRemoveCategory = async (id) => { if(!window.confirm("Xóa Mảng Lớn này sẽ xóa cả nhánh nhỏ bên trong. Chắc chắn?")) return; await saveCategories(taskCategories.filter(c => c.id !== id)); };
  const startEditCategory = (cat) => { setEditingCatId(cat.id); setEditingCatText(cat.name); };
  const cancelEditCategory = () => { setEditingCatId(null); setEditingCatText(''); };
  const saveEditCategory = async (id) => { if(!editingCatText.trim()) return cancelEditCategory(); const newCats = taskCategories.map(c => c.id === id ? { ...c, name: editingCatText } : c); await saveCategories(newCats); setEditingCatId(null); };
  const handleAddSubCategory = async (e, pId) => { e.preventDefault(); const name = subCategoryInputs[pId]; if(!name || !name.trim()) return; const newCats = taskCategories.map(c => c.id === pId ? { ...c, subCategories: [...(c.subCategories || []), { id: 'sub_' + Date.now(), name }] } : c); await saveCategories(newCats); setSubCategoryInputs({...subCategoryInputs, [pId]: ''}); };
  const handleRemoveSubCategory = async (pId, sId) => { if(!window.confirm("Xóa mảng nhỏ này?")) return; await saveCategories(taskCategories.map(c => c.id === pId ? { ...c, subCategories: c.subCategories.filter(s => s.id !== sId) } : c)); };
  const startEditSubCategory = (sub) => { setEditingSubId(sub.id); setEditingSubText(sub.name); };
  const cancelEditSubCategory = () => { setEditingSubId(null); setEditingSubText(''); };
  const saveEditSubCategory = async (catId, subId) => { if(!editingSubText.trim()) return cancelEditSubCategory(); const newCats = taskCategories.map(c => c.id === catId ? { ...c, subCategories: c.subCategories.map(s => s.id === subId ? { ...s, name: editingSubText } : s) } : c); await saveCategories(newCats); setEditingSubId(null); };

  const handleAddDept = async (e) => { e.preventDefault(); try { await axios.post(`${API_URL}/departments`, { id: newDeptId, name: newDeptName }); setNewDeptId(''); setNewDeptName(''); fetchData(user); } catch (err) { alert(err.response?.data?.error || 'Lỗi!'); } };
  const handleDeleteDept = async (id) => { if (window.confirm('Xóa Bộ phận này?')) { await axios.delete(`${API_URL}/departments/${id}`); fetchData(user); } };
  const handleToggleDeptCategory = async (dept, catName, isChecked) => {
    const newCats = isChecked ? [...(dept.categories || []), catName] : (dept.categories || []).filter(c => c !== catName);
    await axios.put(`${API_URL}/departments/${dept.id}/categories`, { categories: newCats });
    fetchData(user);
  };

  const handleCreateUser = async (e) => { e.preventDefault(); if(!newUserForm.department_id && newUserForm.role !== 'admin') return alert('Vui lòng chọn bộ phận trực thuộc!'); try { await axios.post(`${API_URL}/admin/users`, newUserForm); fetchAdminUsers(); fetchData(user); setNewUserForm({ id: '', name: '', role: 'staff', password: '', department_id: '' }); alert('Tạo tài khoản thành công!'); } catch(err) { alert(err.response?.data?.error); } };
  const handleToggleLock = async (u) => { if(window.confirm(`Bạn muốn ${u.is_active ? 'KHÓA' : 'MỞ KHÓA'} tài khoản ${u.name}?`)) { await axios.put(`${API_URL}/admin/users/${u.id}/toggle`, { is_active: u.is_active ? 0 : 1 }); fetchAdminUsers(); }};
  const handleChangePasswordAdmin = async (u) => { const np = window.prompt("Mật khẩu mới:"); if(np) { await axios.put(`${API_URL}/admin/users/${u.id}/password`, { password: np }); alert("Đã đổi!"); } };

  const getAssigneeNames = (ids) => {
    if (!ids || ids.length===0) return 'Chưa giao';
    return ids.map(id => {
      const d = departments.find(x => x.id === id); if (d) return `[Bộ phận] ${d.name}`;
      const u = allUsers.find(x => x.id === id); if (u) return u.name;
      return id;
    }).join(', ');
  };

  const parseDateLocal = (dateStr) => {
      if(!dateStr) return new Date(0);
      const [y, m, d] = dateStr.split('-');
      return new Date(y, m - 1, d);
  };

  const getWeekRange = (year, month, weekNumber) => { 
      const firstDayOfMonth = new Date(year, month - 1, 1); 
      let firstSaturday = new Date(firstDayOfMonth); 
      const dayOfWeek = firstDayOfMonth.getDay(); 
      let offset = dayOfWeek === 6 ? 0 : (dayOfWeek === 0 ? -1 : 6 - dayOfWeek - 7); 
      firstSaturday.setDate(firstDayOfMonth.getDate() + offset); 
      
      const startOfWeek = new Date(firstSaturday); 
      startOfWeek.setDate(firstSaturday.getDate() + (weekNumber - 1) * 7); 
      const endOfWeek = new Date(startOfWeek); 
      endOfWeek.setDate(startOfWeek.getDate() + 6); 
      return { start: startOfWeek, end: endOfWeek }; 
  };
  const getQuarterRange = (year, quarter) => { return { start: new Date(year, (quarter - 1) * 3, 1), end: new Date(year, (quarter - 1) * 3 + 3, 0) }; };
  const getMonthRange = (year, month) => { return { start: new Date(year, month - 1, 1), end: new Date(year, month, 0) }; };
  const getYearRange = (year) => { return { start: new Date(year, 0, 1), end: new Date(year, 11, 31) }; };

  const farmingWeeks = useMemo(() => {
      let weeks = []; let d = new Date(); d.setHours(0,0,0,0);
      for(let i=0; i<8; i++) {
          let wStart = new Date(d); wStart.setDate(d.getDate() - d.getDay() + 1 - (i*7));
          let wEnd = new Date(wStart); wEnd.setDate(wStart.getDate() + 6);
          let wStr = `Tuần ${i===0?'hiện tại': 'trước - ' + i} (${wStart.getDate()}/${wStart.getMonth()+1} - ${wEnd.getDate()}/${wEnd.getMonth()+1})`;
          weeks.push({ label: wStr, key: `W_${wStart.getTime()}`, locked: i >= 2 });
      }
      return weeks;
  }, []);

  const handleFarmingChange = (weekKey, deptId, field, value) => {
      let newData = { ...(formData.additional_data.farming_stats || {}) };
      if (!newData[weekKey]) newData[weekKey] = {};
      if (!newData[weekKey][deptId]) newData[weekKey][deptId] = { rau: '', cu_qua: '', gia_cam: '', gia_suc: '' };
      newData[weekKey][deptId][field] = value;
      handleAdditionalChange({ target: { name: 'farming_stats', value: newData } });
  };

  const emulationRanking = useMemo(() => {
      let scores = {};
      const depts = departments.filter(d => !d.name.toLowerCase().includes('giám đốc') && !d.name.toLowerCase().includes('gđ'));
      
      depts.forEach(d => {
          scores[d.id] = { id: d.id, name: d.name, score: 100, ahead: 0, ontime: 0, overdue: 0, total_tasks: 0 };
      });

      const y = parseInt(emulationFilter.year);
      const m = parseInt(emulationFilter.month);
      const w = parseInt(emulationFilter.week);
      
      let startD, endD;
      if (emulationFilter.view_mode === 'week') {
          const firstDayOfMonth = new Date(y, m - 1, 1); let firstSaturday = new Date(firstDayOfMonth); const dayOfWeek = firstDayOfMonth.getDay();
          let offset = dayOfWeek === 6 ? 0 : (dayOfWeek === 0 ? -1 : 6 - dayOfWeek - 7); 
          firstSaturday.setDate(firstDayOfMonth.getDate() + offset); 
          startD = new Date(firstSaturday); startD.setDate(firstSaturday.getDate() + (w - 1) * 7); 
          endD = new Date(startD); endD.setDate(startD.getDate() + 6);
      } else if (emulationFilter.view_mode === 'month') {
          startD = new Date(y, m - 1, 1); endD = new Date(y, m, 0);
      } else {
          startD = new Date(y, Math.floor((m - 1) / 3) * 3, 1); endD = new Date(y, Math.floor((m - 1) / 3) * 3 + 3, 0);
      }

      tasks.forEach(t => {
          if (!t.due_date) return;
          const dueT = new Date(t.due_date).getTime();
          const startT = t.start_date ? new Date(t.start_date).getTime() : 0;
          const isDone = t.progress_percent === 100;
          const compT = isDone && t.additional_data?.completed_at ? new Date(t.additional_data.completed_at).getTime() : 0;

          let inPeriod = false;
          if (compT > 0) { inPeriod = (compT >= startD.getTime() && compT <= endD.getTime() + 86399999); }
          else { inPeriod = (startT <= endD.getTime() && dueT >= startD.getTime()); }

          if (inPeriod) {
              t.assignees.forEach(aId => {
                  if (scores[aId]) {
                      if (!isRoutine(t)) scores[aId].total_tasks++;
                      if (isRoutine(t)) { }
                      else if (isDone) {
                          if (compT <= dueT - 86400000) { scores[aId].ahead++; }
                          else if (compT <= dueT) { scores[aId].ontime++; }
                          else { scores[aId].overdue++; }
                      } else {
                          if (dueT < endD.getTime()) { scores[aId].overdue++; }
                      }
                      
                      scores[aId].score += parseFloat(t.additional_data?.bonus_pts) || 0;
                      scores[aId].score -= parseFloat(t.additional_data?.penalty_pts) || 0;
                  }
              });
          }
      });

      return Object.values(scores).sort((a, b) => b.score - a.score);
  }, [tasks, departments, emulationFilter]);

  const farmingSummary = useMemo(() => {
      let summary = { rau: 0, cu_qua: 0, gia_cam: 0, gia_suc: 0, detailsByDept: {} };
      const currentYear = new Date().getFullYear();
      
      tasks.forEach(t => {
          if (t.additional_data?.is_farming && t.additional_data?.farming_stats) {
              Object.entries(t.additional_data.farming_stats).forEach(([weekKey, weekData]) => {
                  let y = NaN, q = NaN;
                  if (weekKey.startsWith('W_')) {
                      const ts = parseInt(weekKey.slice(2));
                      if (!isNaN(ts)) {
                          const mid = new Date(ts); mid.setDate(mid.getDate() + 3); 
                          y = mid.getFullYear();
                          q = Math.floor(mid.getMonth() / 3) + 1;
                      }
                  } else {
                      const [wStr, yStr] = weekKey.split('-');
                      y = parseInt(yStr);
                      q = Math.ceil(parseInt(wStr) / 13);
                  }

                  let inPeriod = false;
                  if (selectedTargetPeriod === 'Year') {
                      if (y === currentYear) inPeriod = true;
                  } else if (y === currentYear && `Q${q}` === selectedTargetPeriod) {
                      inPeriod = true;
                  }

                  if (inPeriod) {
                      Object.entries(weekData).forEach(([deptId, stats]) => {
                          if (!summary.detailsByDept[deptId]) summary.detailsByDept[deptId] = { rau: 0, cu_qua: 0, gia_cam: 0, gia_suc: 0, total_units: 0 };
                          
                          ['rau', 'cu_qua', 'gia_cam', 'gia_suc'].forEach(key => {
                              const val = parseFloat(stats[key]) || 0;
                              summary[key] += val;
                              summary.detailsByDept[deptId][key] += val;
                              summary.detailsByDept[deptId].total_units += val;
                          });
                      });
                  }
              });
          }
      });

      const currentPeriodTargets = farmingTargets[selectedTargetPeriod] || {};
      let totalTarget = { rau: 0, cu_qua: 0, gia_cam: 0, gia_suc: 0, total_units: 0 };
      
      Object.values(currentPeriodTargets).forEach(deptTarget => {
          totalTarget.rau += parseFloat(deptTarget.rau) || 0;
          totalTarget.cu_qua += parseFloat(deptTarget.cu_qua) || 0;
          totalTarget.gia_cam += parseFloat(deptTarget.gia_cam) || 0;
          totalTarget.gia_suc += parseFloat(deptTarget.gia_suc) || 0;
      });
      totalTarget.total_units = totalTarget.rau + totalTarget.cu_qua + totalTarget.gia_cam + totalTarget.gia_suc;
      
      let chartData = [];
      const totalActualUnits = summary.rau + summary.cu_qua + summary.gia_cam + summary.gia_suc;

      chartData.push({ name: 'TOÀN XƯỞNG', actual: totalActualUnits, target: totalTarget.total_units, isTotal: true, fill: '#22c55e' });
      chartData.push({ name: '↳ Phân loại: Rau xanh', actual: summary.rau, target: totalTarget.rau, isSub: true, fill: '#16a34a' });
      chartData.push({ name: '↳ Phân loại: Củ quả', actual: summary.cu_qua, target: totalTarget.cu_qua, isSub: true, fill: '#f97316' });
      chartData.push({ name: '↳ Phân loại: Thịt gia cầm', actual: summary.gia_cam, target: totalTarget.gia_cam, isSub: true, fill: '#ef4444' });
      chartData.push({ name: '↳ Phân loại: Thịt gia súc', actual: summary.gia_suc, target: totalTarget.gia_suc, isSub: true, fill: '#3b82f6' });

      let sortedDepts = departments.filter(d => !d.name.toLowerCase().includes('giám đốc') && !d.name.toLowerCase().includes('gđ')).map(dept => {
          const dActual = summary.detailsByDept[dept.id]?.total_units || 0;
          const dTargetObj = currentPeriodTargets[dept.id] || {};
          const dTarget = (parseFloat(dTargetObj.rau)||0) + (parseFloat(dTargetObj.cu_qua)||0) + (parseFloat(dTargetObj.gia_cam)||0) + (parseFloat(dTargetObj.gia_suc)||0);
          const rau = summary.detailsByDept[dept.id]?.rau || 0;
          return { id: dept.id, name: dept.name, actual: dActual, target: dTarget, rau: rau, stats: summary.detailsByDept[dept.id] || {rau:0, cu_qua:0, gia_cam:0, gia_suc:0} };
      }).sort((a, b) => b.rau - a.rau || b.actual - a.actual); 

      sortedDepts.forEach((dept, index) => {
          chartData.push({ name: dept.name, actual: dept.actual, target: dept.target, isDept: true, fill: '#3b82f6', rank: index + 1 });
      });

      return { total: summary, chartData, sortedDepts };
  }, [tasks, farmingTargets, selectedTargetPeriod, departments]);

  const checkCanEditTask = (task) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      if (user.role === 'manager') {
          const staffInDept = allUsers.filter(u => u.department_id === user.department_id).map(u => u.id);
          if (task.creator_id === user.department_id || 
              task.additional_data?.directing_dept === user.department_id || 
              task.assignees.includes(user.department_id) || 
              task.assignees.includes(user.id) || 
              task.assignees.some(a => staffInDept.includes(a))) {
              return true;
          }
      } 
      else if (user.role === 'staff') {
          if (task.assignees.includes(user.id) || task.assignees.includes(user.department_id)) return true;
      }
      return false;
  };

  const getTaskPriority = (t) => {
      if (isRoutine(t)) return 2;
      if (t.progress_percent === 100) return 4; 
      if (!t.start_date || !t.due_date) return 2; 
      const now = new Date().getTime();
      const due = parseDateLocal(t.due_date).getTime() + 86399999; 
      const start = parseDateLocal(t.start_date).getTime();
      if (now > due) return 1; 
      const total = due - start;
      if (total > 0 && (due - now) / total <= 0.2) return 3; 
      return 2; 
  };

  const sortTasks = (tasksArr) => {
      return [...tasksArr].sort((a, b) => {
          const pA = getTaskPriority(a);
          const pB = getTaskPriority(b);
          if (pA !== pB) return pA - pB;
          const dA = a.due_date ? parseDateLocal(a.due_date).getTime() : 0;
          const dB = b.due_date ? parseDateLocal(b.due_date).getTime() : 0;
          return dA - dB;
      });
  };

  const myTasks = useMemo(() => {
    if(user?.role === 'admin') return sortTasks(tasks);
    const myStaffIds = allUsers.filter(u => u.department_id === user?.department_id).map(u => u.id);
    let filtered = tasks.filter(t => {
      if (t.creator_id === user?.id || t.creator_id === user?.department_id || t.additional_data?.directing_dept === user?.department_id) return true;
      if (t.assignees.includes(user?.id) || t.assignees.includes(user?.department_id)) return true;
      if (user?.role === 'manager' && t.assignees.some(a => myStaffIds.includes(a))) return true;
      return false;
    });
    return sortTasks(filtered);
  }, [tasks, user, allUsers]);

  const allTasks = useMemo(() => sortTasks(tasks), [tasks]);
  const displayTasks = activeTab === 'tasks_mine' ? myTasks : allTasks;

  const faultReport = useMemo(() => {
    const report = {}; tasks.forEach(t => { if (t.fault_dept && !isRoutine(t)) { if (!report[t.fault_dept]) report[t.fault_dept] = []; report[t.fault_dept].push(t); } });
    return report;
  }, [tasks]);

  const isTaskInPeriod = (t, startD, endD) => {
    if (!t.start_date || !t.due_date) return false;
    const sT = parseDateLocal(t.start_date).getTime();
    const dT = parseDateLocal(t.due_date).getTime() + 86399999; 
    const pS = startD.getTime();
    const pE = endD.getTime() + 86399999;

    const overlaps = sT <= pE && dT >= pS;
    const isOverdueBeforePeriod = dT < pS; 

    if (t.progress_percent < 100) { return overlaps || isOverdueBeforePeriod; } 
    else {
      let compT = 0;
      if (t.additional_data?.completed_at) { compT = new Date(t.additional_data.completed_at).getTime(); }
      if (compT > 0) {
         const completedInPeriod = compT >= pS && compT <= pE;
         if (compT > dT) return completedInPeriod || (overlaps && compT >= pS); 
         return overlaps;
      }
      return overlaps;
    }
  };

  const meetingData = useMemo(() => {
    const y = parseInt(meetingFilter.year), m = parseInt(meetingFilter.month);
    let startD, endD;
    if (meetingFilter.view_mode === 'week') { const w = parseInt(meetingFilter.week); const r = getWeekRange(y, m, w); startD = r.start; endD = r.end; } 
    else { const r = getMonthRange(y, m); startD = r.start; endD = r.end; }

    let currentList = []; let futureList = [];

    tasks.forEach(t => {
      if (user?.role === 'manager') {
        const myStaffIds = allUsers.filter(u => u.department_id === user?.department_id).map(u => u.id);
        if (!(t.creator_id === user?.department_id || t.additional_data?.directing_dept === user?.department_id || t.assignees.includes(user?.department_id) || t.assignees.some(a => myStaffIds.includes(a)))) return;
      }
      
      const isTaskActiveInPeriod = isTaskInPeriod(t, startD, endD);
      const isDone = t.progress_percent === 100 || isRoutine(t);
      
      if (isTaskActiveInPeriod) {
          currentList.push(t);
          if (!isDone) futureList.push(t);
      } else {
          if (!isDone) {
              futureList.push(t);
          } else if (t.start_date && parseDateLocal(t.start_date).getTime() > endD.getTime()) {
              futureList.push(t);
          }
      }
    });

    const groupByCat = (list) => {
      const grouped = {};
      list.forEach(t => { const cat = t.additional_data?.category || 'CÁC NHIỆM VỤ KHÁC'; if (!grouped[cat]) grouped[cat] = []; grouped[cat].push(t); });
      return grouped;
    };
    return { current: groupByCat(currentList), future: groupByCat(futureList) };
  }, [tasks, meetingFilter, user, allUsers]);

  const toggleFullscreen = () => {
    const elem = document.getElementById("meeting-board");
    if (!elem) return;
    if (!document.fullscreenElement) { elem.requestFullscreen().catch(err => alert(`Lỗi mở toàn màn hình: ${err.message}`)); } 
    else { if (document.exitFullscreen) document.exitFullscreen(); }
  };

  const availableCategories = useMemo(() => {
      if (user?.role === 'admin') return taskCategories;
      const myDept = departments.find(d => d.id === user?.department_id);
      if (!myDept || !myDept.categories) return [];
      const allowedKeys = myDept.categories; 
      return taskCategories.map(cat => {
          const isMainAllowed = allowedKeys.includes(cat.name);
          const allowedSubs = (cat.subCategories || []).filter(sub => isMainAllowed || allowedKeys.includes(`${cat.name}||${sub.name}`));
          if (isMainAllowed || allowedSubs.length > 0) return { ...cat, subCategories: allowedSubs };
          return null;
      }).filter(Boolean);
  }, [taskCategories, departments, user]);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      let newAssignees = [...formData.assignees];
      if (checked) newAssignees.push(value); else newAssignees = newAssignees.filter(id => id !== value);
      setFormData({ ...formData, assignees: newAssignees });
    } else { setFormData({ ...formData, [name]: value }); }
  };
  const handleAdditionalChange = (e) => { setFormData({ ...formData, additional_data: { ...formData.additional_data, [e.target.name]: e.target.value } }); };
  const handleCategoryChange = (e) => { setFormData({ ...formData, additional_data: { ...formData.additional_data, category: e.target.value, sub_category: '' } }); };

  const handleProgressChange = (e) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };
    if (name === 'current_amount' && formData.target_amount > 0) { newFormData.progress_percent = Math.min(Math.round((parseFloat(value || 0) / parseFloat(formData.target_amount)) * 100), 100); }
    if (name === 'progress_percent') { const p = parseInt(value) || 0; newFormData.progress_percent = p > 100 ? 100 : (p < 0 ? 0 : p); }
    setFormData(newFormData);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    let uploadedFilePath = formData.additional_data.attached_file || '';
    let uploadedFileName = formData.additional_data.attached_file_name || '';

    if (selectedFile) {
      const fileData = new FormData(); fileData.append('file', selectedFile);
      try { 
          const uploadRes = await axios.post(`${API_URL}/upload`, fileData, { headers: { 'Content-Type': 'multipart/form-data' } }); 
          uploadedFilePath = uploadRes.data.filePath; uploadedFileName = uploadRes.data.fileName; 
      } catch (err) { alert('Lỗi tải file!'); return; }
    }

    const status = parseInt(formData.progress_percent) === 100 ? 'completed' : 'pending';
    const finalAdditionalData = { ...formData.additional_data, attached_file: uploadedFilePath, attached_file_name: uploadedFileName };
    
    if (status === 'completed' && (!editingTask || editingTask.progress_percent !== 100)) {
        finalAdditionalData.completed_at = new Date().toISOString();
    } else if (status === 'pending') {
        finalAdditionalData.completed_at = null; 
    }

    let manualLogStr = '';
    if (editingTask && JSON.stringify(formData.manpower) !== JSON.stringify(editingTask.manpower)) { manualLogStr = 'Cập nhật Chấm công nhân lực'; }

    const taskData = { ...formData, additional_data: finalAdditionalData, creator_id: user.department_id || user.id, status, current_user_name: user.name, update_details: manualLogStr };
    if (formData.additional_data?.is_farming) {
      const yr = (editingTask?.start_date || '').slice(0, 4) || String(new Date().getFullYear());
      taskData.start_date = `${yr}-01-01`; taskData.due_date = `${yr}-12-31`;
      taskData.target_amount = 0; taskData.target_unit = ''; taskData.current_amount = 0; taskData.progress_percent = 0;
      taskData.fault_dept = ''; taskData.fault_reason = ''; taskData.status = 'pending';
      taskData.additional_data = { ...finalAdditionalData, completed_at: null };
    }
    try {
      if (editingTask) taskData.id = editingTask.id;
      await axios.post(`${API_URL}/tasks`, taskData);
      setShowForm(false); setEditingTask(null); resetForm(); fetchData(user);
    } catch (err) { alert('Lỗi lưu công việc!'); }
  };

  const markComplete = async (task) => {
    if (!window.confirm('Xác nhận Cập nhật 100% và Hoàn thành?')) return;
    const updatedAdditionalData = { ...task.additional_data, completed_at: new Date().toISOString() };
    await axios.post(`${API_URL}/tasks`, { ...task, status: 'completed', progress_percent: 100, current_amount: task.target_amount, current_user_name: user.name, update_details: 'Xác nhận 100% Hoàn thành', additional_data: updatedAdditionalData });
    fetchData(user);
  };

  const handleDeleteTask = async (id) => {
    if (user.role !== 'admin') return alert('Chỉ Admin mới có quyền xóa nhiệm vụ!');
    if (!window.confirm('CẢNH BÁO: Bạn có chắc chắn muốn XÓA HOÀN TOÀN nhiệm vụ này khỏi hệ thống? Hành động này không thể khôi phục.')) return;
    try {
      await axios.delete(`${API_URL}/tasks/${id}`);
      fetchData(user);
    } catch (err) { alert('Lỗi khi xóa nhiệm vụ! Vui lòng kiểm tra lại Máy chủ.'); }
  };

  const openEditForm = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title, start_date: task.start_date || '', due_date: task.due_date, assignees: task.assignees || [], 
      additional_data: task.additional_data || { note: '', category: '', sub_category: '', attached_file: '', attached_file_name: '', completed_at: task.additional_data?.completed_at || null, directing_dept: task.additional_data?.directing_dept || '', bonus_dept: task.additional_data?.bonus_dept || '', bonus_pts: task.additional_data?.bonus_pts || 0, bonus_reason: task.additional_data?.bonus_reason || '', penalty_dept: task.additional_data?.penalty_dept || '', penalty_pts: task.additional_data?.penalty_pts || 0, penalty_reason: task.additional_data?.penalty_reason || '', is_farming: task.additional_data?.is_farming || false, farming_stats: task.additional_data?.farming_stats || {} },
      target_amount: task.target_amount || 0, target_unit: task.target_unit || '', current_amount: task.current_amount || 0, progress_percent: task.progress_percent || 0, manpower: task.manpower || [],
      fault_dept: task.fault_dept || '', fault_reason: task.fault_reason || ''
    });
    setSelectedFile(null); setShowForm(true);
  };

  const handleUploadReport = async (e) => {
    e.preventDefault();
    if (!uploadReportFile) return alert("Vui lòng chọn file báo cáo!");
    let reportTitle = '', reportPeriodType = ''; 
    if (uploadReportFilter.view_mode === 'week') { reportTitle = `Báo cáo Tuần ${uploadReportFilter.week} - Tháng ${uploadReportFilter.month}/${uploadReportFilter.year}`; reportPeriodType = `YEAR_${uploadReportFilter.year}_Q_${uploadReportFilter.quarter}_M_${uploadReportFilter.month}_W_${uploadReportFilter.week}`; } 
    else if (uploadReportFilter.view_mode === 'month') { reportTitle = `Báo cáo Tháng ${uploadReportFilter.month}/${uploadReportFilter.year}`; reportPeriodType = `YEAR_${uploadReportFilter.year}_Q_${uploadReportFilter.quarter}_M_${uploadReportFilter.month}_W_ALL`; } 
    else if (uploadReportFilter.view_mode === 'quarter') { reportTitle = `Báo cáo Quý ${['I','II','III','IV'][uploadReportFilter.quarter - 1]}/${uploadReportFilter.year}`; reportPeriodType = `YEAR_${uploadReportFilter.year}_Q_${uploadReportFilter.quarter}_M_ALL_W_ALL`; } 
    else { reportTitle = `Báo cáo Tổng kết Năm ${uploadReportFilter.year}`; reportPeriodType = `YEAR_${uploadReportFilter.year}_Q_ALL_M_ALL_W_ALL`; }

    const fileData = new FormData(); fileData.append('file', uploadReportFile);
    try {
      const uploadRes = await axios.post(`${API_URL}/upload`, fileData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await axios.post(`${API_URL}/reports`, { title: reportTitle, period_type: reportPeriodType, file_path: uploadRes.data.filePath, file_name: uploadRes.data.fileName, created_by: user.name });
      alert("Tải Báo cáo thành công!"); setUploadReportFile(null); fetchReports();
    } catch (err) { alert("Lỗi hệ thống khi tải báo cáo: " + (err.response?.data?.error || err.message)); }
  };
  const handleDeleteReport = async (id) => { if(!window.confirm("Bạn muốn xóa hẳn báo cáo này?")) return; await axios.delete(`${API_URL}/reports/${id}`); fetchReports(); };

  const generateReportDraft = () => {
    const y = parseInt(draftFilterObj.year), m = parseInt(draftFilterObj.month), q = parseInt(draftFilterObj.quarter);
    let startD, endD, timeTitle = '';
    
    if (draftFilterObj.view_mode === 'week') { const w = parseInt(draftFilterObj.week); const range = getWeekRange(y, m, w); startD = range.start; endD = range.end; timeTitle = `Tuần ${w} - Tháng ${m}/${y} (Từ ${startD.toLocaleDateString('vi-VN')} đến ${endD.toLocaleDateString('vi-VN')})`; } 
    else if (draftFilterObj.view_mode === 'month') { const range = getMonthRange(y, m); startD = range.start; endD = range.end; timeTitle = `Tháng ${m}/${y} (Từ ${startD.toLocaleDateString('vi-VN')} đến ${endD.toLocaleDateString('vi-VN')})`; } 
    else if (draftFilterObj.view_mode === 'quarter') { const range = getQuarterRange(y, q); startD = range.start; endD = range.end; timeTitle = `Quý ${['I','II','III','IV'][q - 1]} năm ${y} (Từ ${startD.toLocaleDateString('vi-VN')} đến ${endD.toLocaleDateString('vi-VN')})`; } 
    else { const range = getYearRange(y); startD = range.start; endD = range.end; timeTitle = `Năm ${y} (Từ ${startD.toLocaleDateString('vi-VN')} đến ${endD.toLocaleDateString('vi-VN')})`; }

    let nextPeriodEnd = new Date(endD);
    if (draftFilterObj.view_mode === 'week') { nextPeriodEnd.setDate(nextPeriodEnd.getDate() + 7); } 
    else if (draftFilterObj.view_mode === 'month') { nextPeriodEnd = new Date(nextPeriodEnd.getFullYear(), nextPeriodEnd.getMonth() + 2, 0); } 
    else if (draftFilterObj.view_mode === 'quarter') { nextPeriodEnd = new Date(nextPeriodEnd.getFullYear(), nextPeriodEnd.getMonth() + 4, 0); } 
    else { nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1); }
    nextPeriodEnd.setHours(23,59,59,999);

    const currentTasks = tasks.filter(t => isTaskInPeriod(t, startD, endD));
    const futureTasks = tasks.filter(t => {
         if (t.progress_percent === 100) return false;
         if (!t.due_date || !t.start_date) return false;
         const dT = parseDateLocal(t.due_date).getTime() + 86399999;
         return dT > endD.getTime(); 
    });

    const formatTaskLine = (t, isDirectionMode) => {
        const assignees = getAssigneeNames(t.assignees);
        if (!isDirectionMode) {
            let pStatus = isRoutine(t) ? `[Thường xuyên]` : (t.progress_percent === 100 ? `[ĐÃ XONG]` : `[Tiến độ: ${t.progress_percent}%]`);
            if (t.progress_percent < 100 && t.target_amount > 0) pStatus = `[Đạt: ${t.current_amount}/${t.target_amount} ${t.target_unit}]`;
            
            let manpowerSum = (t.manpower || []).reduce((s, m) => s + (parseFloat(m.count)||0), 0);
            let mpText = manpowerSum > 0 ? ` | Mất ${manpowerSum} công` : '';
            let overdueNote = (!isRoutine(t) && t.progress_percent < 100 && parseDateLocal(t.due_date).getTime() < new Date().getTime()) ? ` - CHẬM (Do: ${departments.find(d=>d.id===t.fault_dept)?.name || t.fault_dept || 'Chưa báo cáo'})` : '';
            
            return `  - ${t.title} ${pStatus}${mpText}${overdueNote} (Thực hiện: ${assignees})\n`;
        } else {
            let sT = parseDateLocal(t.start_date).getTime();
            let actionNote = "Tiếp tục thực hiện"; 
            if (sT > endD.getTime() && sT <= nextPeriodEnd.getTime()) { actionNote = "Triển khai mới"; } 
            else if (sT > nextPeriodEnd.getTime()) { actionNote = "Làm công tác chuẩn bị"; }
            return `  - ${t.title} (Kết thúc: ${t.due_date}) - [${actionNote}] (Thực hiện: ${assignees})\n`;
        }
    };

    const buildSection = (taskList, isDirectionMode) => {
        let sectionText = '';
        const categoriesGroups = {};
        const uncategorizedTasks = [];

        taskList.forEach(t => {
            const cat = t.additional_data?.category;
            if (cat) {
                if (!categoriesGroups[cat]) categoriesGroups[cat] = [];
                categoriesGroups[cat].push(t);
            } else { uncategorizedTasks.push(t); }
        });

        const roman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV"];
        let catIndex = 0;

        taskCategories.forEach(cat => {
            if (categoriesGroups[cat.name] && categoriesGroups[cat.name].length > 0) {
                sectionText += `${roman[catIndex]}. ${cat.name.toUpperCase()}\n`;
                catIndex++;
                categoriesGroups[cat.name].forEach(t => { sectionText += formatTaskLine(t, isDirectionMode); });
                sectionText += '\n';
                delete categoriesGroups[cat.name]; 
            }
        });

        for (const [catName, catTasks] of Object.entries(categoriesGroups)) {
            sectionText += `${roman[catIndex]}. ${catName.toUpperCase()}\n`;
            catIndex++;
            catTasks.forEach(t => { sectionText += formatTaskLine(t, isDirectionMode); });
            sectionText += '\n';
        }

        if (uncategorizedTasks.length > 0) {
            sectionText += `${roman[catIndex]}. CÁC NHIỆM VỤ KHÁC\n`;
            uncategorizedTasks.forEach(t => { sectionText += formatTaskLine(t, isDirectionMode); });
            sectionText += '\n';
        }
        return sectionText || "  (Không có dữ liệu)\n\n";
    };

    let reportFull = `BÁO CÁO KẾT QUẢ VÀ PHƯƠNG HƯỚNG THỰC HIỆN NHIỆM VỤ\nThời điểm: ${timeTitle}\n\n`;
    reportFull += `PHẦN A. KẾT QUẢ THỰC HIỆN TRONG KỲ\n`;
    reportFull += `-------------------------------------------------\n`;
    reportFull += buildSection(currentTasks, false);
    
    reportFull += `PHẦN B. PHƯƠNG HƯỚNG NHIỆM VỤ THỜI GIAN TỚI\n`;
    reportFull += `-------------------------------------------------\n`;
    reportFull += buildSection(futureTasks, true);

    return reportFull;
  };

  const resetForm = () => { setFormData({ title: '', start_date: '', due_date: '', assignees: [], additional_data: { note: '', category: '', sub_category: '', attached_file: '', attached_file_name: '', completed_at: null, directing_dept: '', bonus_dept: '', bonus_pts: 0, bonus_reason: '', penalty_dept: '', penalty_pts: 0, penalty_reason: '', is_farming: false, farming_stats: {} }, target_amount: 0, target_unit: '', current_amount: 0, progress_percent: 0, manpower: [], fault_dept: '', fault_reason: '' }); setSelectedFile(null); };

  const groupedReports = useMemo(() => {
    const groups = {};
    reports.forEach(r => {
      const tags = r.period_type.split('_'); const year = tags[1]; const quarter = tags[3]; const month = tags[5]; const week = tags[7];
      if (!groups[year]) groups[year] = { year:[], quarter:[], month:[], week:[] };
      if (week !== 'ALL') groups[year].week.push(r);
      else if (month !== 'ALL') groups[year].month.push(r);
      else if (quarter !== 'ALL') groups[year].quarter.push(r);
      else groups[year].year.push(r);
    });
    return groups;
  }, [reports]);

  if (!user) {
    return (
      <div 
        className="min-h-screen w-full bg-cover bg-center relative flex flex-col md:flex-row"
        style={{ backgroundImage: "url('/anh-nen.jpg')", backgroundColor: "#1a202c" }} 
      >
        <div className="absolute inset-0 bg-black/50"></div>

        <div className="relative z-10 flex-1 flex flex-col justify-end p-8 md:p-12 md:pb-16">
          <div className="flex items-center space-x-4 mb-4">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-16 md:h-20 object-contain rounded-lg drop-shadow-md bg-white/10 p-1" />
            ) : (
              <Shield className="text-yellow-400 h-14 w-14" />
            )}
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase drop-shadow-xl">{systemName}</h2>
          </div>
          <div className="text-gray-200 text-sm md:text-base font-medium bg-black/50 inline-block px-5 py-3 rounded-xl backdrop-blur-md border border-white/10 max-w-fit shadow-lg">
            Được thiết kế bởi 4/ Lê Văn Hậu<br/>
            Mọi thắc mắc liên hệ: <span className="text-yellow-400 font-bold">0865 138 963</span>
          </div>
        </div>

        <div className="relative z-10 w-full md:w-auto p-8 md:p-12 flex justify-center md:justify-end items-start pt-12 md:pt-16">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-[320px] overflow-hidden border-t-8 border-red-700">
            <div className="bg-red-800/95 p-5 text-center text-white flex flex-col items-center">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-12 object-contain mb-2" />
              ) : (
                <Shield size={36} className="text-yellow-400 mb-2" />
              )}
              <h1 className="text-lg font-black uppercase">Đăng Nhập</h1>
            </div>
            <form onSubmit={handleLogin} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">ID ĐĂNG NHẬP</label>
                <input type="text" value={loginId} onChange={e=>setLoginId(e.target.value)} required className="w-full border border-gray-300 p-2.5 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-red-600 text-sm transition"/>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">MẬT KHẨU</label>
                <input type="password" value={loginPass} onChange={e=>setLoginPass(e.target.value)} required className="w-full border border-gray-300 p-2.5 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-red-600 text-sm transition"/>
              </div>
              <button type="submit" className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 rounded-lg uppercase text-sm mt-2 transition shadow-md">Truy cập</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-10">
      <header className="bg-red-800 text-white shadow-md border-b-4 border-yellow-500 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded bg-white/10 p-0.5" />
            ) : (
              <Shield className="text-yellow-400 h-8 w-8" />
            )}
            <div><h1 className="text-xl font-black uppercase tracking-wide">{systemName}</h1><p className="text-xs text-red-200">Quản lý và điều hành nhiệm vụ</p></div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto">
            <button onClick={() => setActiveTab('tasks_mine')} className={`px-4 py-2 font-bold rounded-lg whitespace-nowrap ${activeTab === 'tasks_mine' ? 'bg-white text-red-800' : 'hover:bg-red-700'}`}>NHIỆM VỤ</button>
            <button onClick={() => setActiveTab('tasks_all')} className={`px-4 py-2 font-bold rounded-lg whitespace-nowrap ${activeTab === 'tasks_all' ? 'bg-white text-red-800' : 'hover:bg-red-700'}`}>NV TOÀN XƯỞNG</button>
            {(user.role === 'admin' || user.role === 'manager') && <button onClick={() => setActiveTab('meeting')} className={`px-4 py-2 font-bold rounded-lg flex items-center whitespace-nowrap ${activeTab === 'meeting' ? 'bg-white text-red-800' : 'hover:bg-red-700'}`}><MonitorPlay size={18} className="mr-1.5"/> PHÒNG HỌP</button>}
            
            {/* TẤT CẢ CÁC BỘ PHẬN ĐỀU CÓ QUYỀN XEM BÁO CÁO & THI ĐUA */}
            <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 font-bold rounded-lg flex items-center whitespace-nowrap ${activeTab === 'reports' ? 'bg-white text-red-800' : 'hover:bg-red-700'}`}><FileBarChart size={18} className="mr-1.5"/> BÁO CÁO</button>
            <button onClick={() => setActiveTab('emulation')} className={`px-4 py-2 font-bold rounded-lg flex items-center whitespace-nowrap ${activeTab === 'emulation' ? 'bg-white text-red-800' : 'hover:bg-red-700'}`}><Target size={18} className="mr-1.5"/> THI ĐUA</button>
            
            {user.role === 'admin' && <button onClick={() => setActiveTab('admin')} className={`p-2 rounded-lg ${activeTab === 'admin' ? 'bg-white text-red-800' : 'bg-yellow-600 hover:bg-yellow-700'}`} title="Quản trị Hệ thống"><Settings size={20}/></button>}
            <button onClick={() => setShowPassModal(true)} className="p-2 bg-gray-800 hover:bg-black rounded-lg transition" title="Đổi mật khẩu cá nhân"><Key size={18}/></button>
            <button onClick={() => setUser(null)} className="p-2 bg-red-900 hover:bg-red-950 rounded-lg border border-red-700" title="Thoát"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      <main className={`${activeTab === 'emulation' ? 'max-w-[1800px]' : 'max-w-7xl'} mx-auto px-6 py-8`}>
        
        {/* ================= TAB QUẢN TRỊ ADMIN ================= */}
        {activeTab === 'admin' && user.role === 'admin' && (
          <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-yellow-500">
             <h2 className="text-2xl font-extrabold text-gray-800 mb-6 flex items-center"><Shield className="mr-2 text-red-700"/> Bảng Quản Trị Hệ Thống</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              
              <div className="space-y-8">
                {/* ĐỔI TÊN ĐƠN VỊ & LOGO */}
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <h3 className="font-bold text-lg mb-3 uppercase text-red-700 border-b pb-2">Cài Đặt Đơn Vị & Logo</h3>
                  <form onSubmit={handleUpdateSystemName} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Tên Đơn Vị</label>
                      <input type="text" value={editSystemName} onChange={e=>setEditSystemName(e.target.value)} required className="w-full border p-2.5 rounded font-bold text-gray-800 focus:ring-2 focus:ring-red-600 outline-none"/>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Logo Hệ Thống</label>
                      <div className="flex items-center space-x-3 mb-2">
                        {editLogoUrl ? (
                          <img src={editLogoUrl} alt="Logo Preview" className="h-12 w-12 object-contain border p-1 rounded bg-white" />
                        ) : (
                          <div className="h-12 w-12 border rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">Chưa logo</div>
                        )}
                        <input type="text" value={editLogoUrl} onChange={e=>setEditLogoUrl(e.target.value)} placeholder="Đường dẫn ảnh Logo (URL)..." className="flex-1 border p-2 rounded text-xs outline-none"/>
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="cursor-pointer bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded text-xs flex items-center">
                          <Image size={14} className="mr-1"/> Tải Logo từ Máy
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                        {editLogoUrl && <button type="button" onClick={() => setEditLogoUrl('')} className="text-xs text-red-500 underline">Xóa logo hiện tại</button>}
                      </div>
                    </div>

                    <button type="submit" className="bg-red-700 hover:bg-red-800 text-white font-bold py-2.5 px-6 rounded mt-2"><Save size={18} className="mr-2 inline"/> Lưu Cài Đặt</button>
                  </form>
                </div>
                
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <h3 className="font-bold text-lg mb-3 uppercase text-red-700 border-b pb-2">Trường Nhập Liệu Tùy Biến (Form Mở rộng)</h3>
                  <div className="flex flex-col gap-2 mb-4">{customFields.map(field => (<div key={field.id} className="bg-white border rounded px-3 py-2 flex items-center justify-between shadow-sm">{editingFieldId === field.id ? (<div className="flex w-full space-x-2"><input type="text" value={editingFieldText} onChange={(e) => setEditingFieldText(e.target.value)} className="flex-1 border p-1 rounded outline-none focus:border-red-500 text-sm" autoFocus/><button onClick={() => saveEditField(field.id)} className="text-green-600 bg-green-50 p-1 rounded"><Check size={16}/></button><button onClick={cancelEditField} className="text-gray-500 bg-gray-100 p-1 rounded"><X size={16}/></button></div>) : (<><span className="text-sm font-semibold text-gray-800 mr-2 flex-1">{field.label}</span><div className="flex space-x-2"><button onClick={() => startEditField(field)} className="text-blue-500 hover:text-blue-700"><Edit2 size={16}/></button><button onClick={() => handleRemoveCustomField(field.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button></div></>)}</div>))}</div>
                  <form onSubmit={handleAddCustomField} className="flex gap-2"><input type="text" value={newFieldName} onChange={e=>setNewFieldName(e.target.value)} placeholder="Tên trường (vd: Link báo cáo)..." className="flex-1 border p-2.5 rounded focus:ring-2 focus:ring-red-600 outline-none text-sm"/><button type="submit" className="bg-gray-800 text-white px-4 rounded font-bold shadow hover:bg-black"><Plus size={18}/></button></form>
                </div>
              </div>

              <div className="bg-blue-50 p-5 rounded-xl border border-blue-200">
                <h3 className="font-bold text-lg mb-3 uppercase text-blue-800 border-b border-blue-200 pb-2">Danh sách Mảng Nhiệm vụ Lớn/Nhỏ</h3>
                <div className="flex flex-col gap-4 mb-6">
                  {taskCategories.map(cat => (
                    <div key={cat.id} className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm relative">
                      <div className="flex justify-between items-center mb-3 border-b pb-2">
                        {editingCatId === cat.id ? (
                          <div className="flex w-full space-x-2 pr-2">
                            <input type="text" value={editingCatText} onChange={(e) => setEditingCatText(e.target.value)} className="flex-1 border p-1 rounded outline-none focus:border-blue-500 font-bold text-lg" autoFocus/>
                            <button onClick={() => saveEditCategory(cat.id)} className="text-green-600 bg-green-50 p-1 rounded"><Check size={16}/></button><button onClick={cancelEditCategory} className="text-gray-500 bg-gray-100 p-1 rounded"><X size={16}/></button>
                          </div>
                        ) : (
                          <>
                            <h4 className="font-bold text-lg border-l-4 border-red-600 pl-2 text-gray-900">{cat.name}</h4>
                            <div className="flex space-x-2">
                              <button onClick={() => startEditCategory(cat)} className="text-blue-500 hover:text-blue-700"><Edit2 size={16}/></button><button onClick={() => handleRemoveCategory(cat.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="pl-3 space-y-2 border-l-2 border-gray-100 mb-3 mt-2">
                        {cat.subCategories?.map(sub => (
                          <div key={sub.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded border border-gray-100 text-sm">
                            {editingSubId === sub.id ? (
                              <div className="flex w-full space-x-2">
                                <input type="text" value={editingSubText} onChange={(e) => setEditingSubText(e.target.value)} className="flex-1 border p-1 rounded outline-none focus:border-blue-500" autoFocus/>
                                <button onClick={() => saveEditSubCategory(cat.id, sub.id)} className="text-green-600"><Check size={16}/></button><button onClick={cancelEditSubCategory} className="text-gray-500"><X size={16}/></button>
                              </div>
                            ) : (
                              <>
                                <span className="font-medium text-gray-700">{sub.name}</span>
                                <div className="flex space-x-2">
                                  <button onClick={() => startEditSubCategory(sub)} className="text-blue-400 hover:text-blue-600"><Edit2 size={14}/></button><button onClick={() => handleRemoveSubCategory(cat.id, sub.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                        <form onSubmit={(e) => handleAddSubCategory(e, cat.id)} className="flex mt-2">
                          <input type="text" value={subCategoryInputs[cat.id] || ''} onChange={e => setSubCategoryInputs({...subCategoryInputs, [cat.id]: e.target.value})} placeholder="Thêm mảng nhỏ..." className="text-sm border border-gray-300 p-1.5 rounded-l w-full outline-none focus:border-blue-500"/>
                          <button type="submit" className="bg-gray-800 text-white px-3 rounded-r hover:bg-black"><Plus size={14}/></button>
                        </form>
                      </div>
                    </div>
                  ))}
                  <form onSubmit={handleAddCategory} className="flex w-full">
                    <input type="text" value={newCategoryName} onChange={e=>setNewCategoryName(e.target.value)} placeholder="Tạo Mảng Lớn..." className="border border-blue-300 p-2 rounded-l flex-1 outline-none text-sm font-bold" />
                    <button type="submit" className="bg-blue-700 text-white px-4 py-2 rounded-r font-bold hover:bg-blue-800"><Plus size={18}/></button>
                  </form>
                </div>

                <h3 className="font-bold text-lg mb-3 mt-6 uppercase text-blue-800 border-b border-blue-200 pb-2">Bộ phận</h3>
                <div className="flex flex-col gap-4 mb-4">
                  {departments.map(dept => (
                    <div key={dept.id} className="bg-white border border-blue-100 rounded-lg p-3 shadow-sm">
                      <div className="flex items-center justify-between border-b pb-2 mb-2">
                        <span className="text-base font-black text-gray-800"><Home size={16} className="inline mr-1 text-blue-600"/>{dept.name} <span className="text-xs text-gray-400 font-mono font-normal">({dept.id})</span></span>
                        <div className="space-x-2">
                          <button onClick={() => setEditingDeptCatsId(editingDeptCatsId === dept.id ? null : dept.id)} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold hover:bg-blue-200">Ngành phụ trách</button>
                          <button onClick={() => handleDeleteDept(dept.id)} className="text-red-400 hover:text-red-700"><Trash2 size={16} className="inline"/></button>
                        </div>
                      </div>
                      
                      {editingDeptCatsId === dept.id && (
                        <div className="bg-gray-50 p-3 rounded border border-gray-200 mt-2">
                           <h4 className="text-xs font-bold text-gray-600 uppercase mb-2">Chọn Mảng nhiệm vụ giao cho Ban:</h4>
                           {taskCategories.length === 0 ? (
                               <p className="text-xs text-red-500 italic">Vui lòng tạo Mảng Nhiệm Vụ ở bên trên trước!</p>
                           ) : (
                               <div className="space-y-3 mb-2 max-h-[300px] overflow-y-auto pr-2">
                                 {taskCategories.map(cat => {
                                   const isMainAssigned = (dept.categories || []).includes(cat.name);
                                   return (
                                     <div key={cat.id} className="bg-white border border-gray-200 rounded p-2 shadow-sm">
                                       <label className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-blue-50 p-1 rounded">
                                         <input type="checkbox" checked={isMainAssigned} onChange={(e) => handleToggleDeptCategory(dept, cat.name, e.target.checked)} className="w-4 h-4 text-blue-700 rounded"/>
                                         <span className="font-bold text-blue-900">{cat.name} <span className="text-xs font-normal text-gray-500">(Giao toàn bộ mảng)</span></span>
                                       </label>
                                       {cat.subCategories && cat.subCategories.length > 0 && (
                                         <div className="ml-6 mt-1 space-y-1 border-l-2 border-dashed border-gray-200 pl-3">
                                           {cat.subCategories.map(sub => {
                                             const subKey = `${cat.name}||${sub.name}`; 
                                             const isSubAssigned = (dept.categories || []).includes(subKey) || isMainAssigned;
                                             return (
                                               <label key={sub.id} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                                                 <input type="checkbox" checked={isSubAssigned} disabled={isMainAssigned} onChange={(e) => handleToggleDeptCategory(dept, subKey, e.target.checked)} className="w-3.5 h-3.5 text-blue-500 rounded disabled:opacity-40"/>
                                                 <span className={`font-medium ${isMainAssigned ? 'text-gray-400' : 'text-gray-700'}`}>{sub.name}</span>
                                               </label>
                                             )
                                           })}
                                         </div>
                                       )}
                                     </div>
                                   )
                                 })}
                               </div>
                           )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <h4 className="font-bold text-sm text-gray-700 mb-2">Tạo Bộ phận mới</h4>
                <form onSubmit={handleAddDept} className="flex gap-2">
                  <input type="text" value={newDeptId} onChange={e=>setNewDeptId(e.target.value)} placeholder="Mã..." required className="w-24 border p-2.5 rounded outline-none text-sm"/>
                  <input type="text" value={newDeptName} onChange={e=>setNewDeptName(e.target.value)} placeholder="Tên Bộ phận..." required className="flex-1 border p-2.5 rounded outline-none text-sm"/>
                  <button type="submit" className="bg-blue-700 text-white px-4 rounded font-bold shadow hover:bg-blue-800">Thêm</button>
                </form>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
              <div className="lg:col-span-1 bg-gray-50 p-5 rounded-xl border border-gray-200">
                <h3 className="font-bold text-lg mb-4 uppercase text-red-700 border-b pb-2">Cấp Tài Khoản Mới</h3>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div><input type="text" value={newUserForm.id} onChange={e=>setNewUserForm({...newUserForm, id: e.target.value})} required placeholder="ID Đăng nhập" className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-red-600"/></div>
                  <div><input type="text" value={newUserForm.name} onChange={e=>setNewUserForm({...newUserForm, name: e.target.value})} required placeholder="Tên người dùng / Cá nhân" className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-red-600"/></div>
                  <div>
                    <select value={newUserForm.department_id} onChange={e=>setNewUserForm({...newUserForm, department_id: e.target.value})} className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-red-600">
                      <option value="">-- Thuộc Bộ phận / Đơn vị nào? --</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <select value={newUserForm.role} onChange={e=>setNewUserForm({...newUserForm, role: e.target.value})} className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-red-600">
                      <option value="user">-- Chọn Cấp độ Phân quyền --</option>
                      <option value="admin">Quản trị Hệ thống (Admin)</option>
                      <option value="manager">Trưởng / Phó Bộ phận</option>
                      <option value="staff">Nhân viên</option>
                    </select>
                  </div>
                  <div><input type="password" value={newUserForm.password} onChange={e=>setNewUserForm({...newUserForm, password: e.target.value})} required placeholder="Mật khẩu" className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-red-600"/></div>
                  <button type="submit" className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-2 rounded transition"><UserPlus size={18} className="inline mr-2"/> Cấp Tài Khoản</button>
                </form>
              </div>
              <div className="lg:col-span-2">
                <h3 className="font-bold text-lg mb-4 uppercase text-gray-700 border-b pb-2">Danh sách Tài khoản Hiện có</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse bg-white border border-gray-200">
                    <thead><tr className="bg-gray-100 text-gray-700"><th className="p-3 border-b">ID</th><th className="p-3 border-b">Họ Tên</th><th className="p-3 border-b">Thuộc Đơn Vị</th><th className="p-3 border-b">Cấp độ</th><th className="p-3 border-b text-center">Khóa</th><th className="p-3 border-b text-center">Pass</th></tr></thead>
                    <tbody>
                      {adminUsers.map(u => (
                        <tr key={u.id} className="hover:bg-red-50 border-b border-gray-100">
                          <td className="p-3 font-mono text-sm">{u.id}</td>
                          <td className="p-3 font-bold text-sm text-gray-800">{u.name}</td>
                          <td className="p-3 text-xs text-blue-700 font-semibold">{departments.find(d=>d.id===u.department_id)?.name || 'Chưa thuộc đơn vị'}</td>
                          <td className="p-3 text-xs">
                            {u.role === 'admin' ? <span className="bg-red-100 text-red-800 px-2 py-1 rounded">Admin</span> : 
                             u.role === 'manager' ? <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Trưởng/Phó</span> :
                             <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">Nhân viên</span>}
                          </td>
                          <td className="p-3 text-center"><button onClick={() => handleToggleLock(u)} className={`p-1.5 rounded ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`} title="Khóa/Mở">{u.is_active ? <Unlock size={14}/> : <Lock size={14}/>}</button></td>
                          <td className="p-3 text-center"><button onClick={() => handleChangePasswordAdmin(u)} className="bg-gray-200 text-gray-700 p-1.5 rounded hover:bg-gray-300" title="Cấp lại Mật khẩu"><Key size={14}/></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB PHÒNG HỌP THÔNG MINH (GLASSMORPHISM STARRY MEETING) ================= */}
        {activeTab === 'meeting' && (
          <div className="space-y-6">
             <div 
               id="meeting-board" 
               className="relative rounded-3xl shadow-2xl p-6 md:p-8 text-white min-h-[75vh] overflow-y-auto border border-white/20 backdrop-blur-2xl transition-all"
               style={{
                 background: "linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 27, 75, 0.92) 50%, rgba(15, 23, 42, 0.96) 100%)",
                 boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.2)"
               }}
             >
                {/* Ánh sáng dạ quang nền hiệu ứng kính */}
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

                {/* HEADER BẢNG GIAO BAN */}
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center border-b border-white/15 pb-5 mb-8 gap-4">
                   <div className="flex items-center space-x-3">
                     <div className="p-3 bg-blue-500/20 border border-blue-400/30 rounded-2xl backdrop-blur-md shadow-lg">
                       <MonitorPlay size={28} className="text-blue-300 animate-pulse"/>
                     </div>
                     <div>
                       <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-sky-200">
                         GIAO BAN
                       </h2>
                       <p className="text-xs text-blue-200/70 font-medium">Hệ thống điều hành & báo cáo thời gian thực</p>
                     </div>
                   </div>

                   <div className="flex flex-wrap items-center gap-3">
                      <select 
                        value={meetingFilter.year} 
                        onChange={e=>setMeetingFilter({...meetingFilter, year: e.target.value})} 
                        className="bg-white/10 border border-white/20 text-white text-sm p-2.5 rounded-xl font-bold outline-none backdrop-blur-md hover:bg-white/20 transition cursor-pointer"
                      >
                        <option value="2025" className="bg-slate-900 text-white">Năm 2025</option>
                        <option value="2026" className="bg-slate-900 text-white">Năm 2026</option>
                        <option value="2027" className="bg-slate-900 text-white">Năm 2027</option>
                      </select>

                      <select 
                        value={meetingFilter.view_mode} 
                        onChange={e=>setMeetingFilter({...meetingFilter, view_mode: e.target.value})} 
                        className="bg-white/10 border border-white/20 text-white text-sm p-2.5 rounded-xl font-bold outline-none backdrop-blur-md hover:bg-white/20 transition cursor-pointer"
                      >
                        <option value="week" className="bg-slate-900 text-white">Giao ban Tuần</option>
                        <option value="month" className="bg-slate-900 text-white">Giao ban Tháng</option>
                      </select>

                      {meetingFilter.view_mode === 'month' ? (
                         <select 
                           value={meetingFilter.month} 
                           onChange={e=>setMeetingFilter({...meetingFilter, month: e.target.value})} 
                           className="bg-white/10 border border-white/20 text-white text-sm p-2.5 rounded-xl font-bold outline-none backdrop-blur-md hover:bg-white/20 transition cursor-pointer"
                         >
                           {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m} className="bg-slate-900 text-white">Tháng {m}</option>)}
                         </select>
                      ) : (
                         <div className="flex space-x-2">
                           <select 
                             value={meetingFilter.month} 
                             onChange={e=>setMeetingFilter({...meetingFilter, month: e.target.value})} 
                             className="bg-white/10 border border-white/20 text-white text-sm p-2.5 rounded-xl font-bold outline-none backdrop-blur-md hover:bg-white/20 transition cursor-pointer"
                           >
                             {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m} className="bg-slate-900 text-white">Tháng {m}</option>)}
                           </select>
                           <select 
                             value={meetingFilter.week} 
                             onChange={e=>setMeetingFilter({...meetingFilter, week: e.target.value})} 
                             className="bg-white/10 border border-white/20 text-white text-sm p-2.5 rounded-xl font-bold outline-none backdrop-blur-md hover:bg-white/20 transition cursor-pointer"
                           >
                             {[1,2,3,4,5].map(w => <option key={w} value={w} className="bg-slate-900 text-white">Tuần {w}</option>)}
                           </select>
                         </div>
                      )}

                      <button 
                        onClick={toggleFullscreen} 
                        className="bg-blue-600/80 hover:bg-blue-500 border border-blue-400/40 p-2.5 rounded-xl shadow-lg backdrop-blur-md transition text-white hover:scale-105 active:scale-95" 
                        title="Toàn Màn Hình"
                      >
                        <Maximize size={20}/>
                      </button>
                   </div>
                </div>

                {/* NỘI DUNG NHIỆM VỤ */}
                {Object.keys(meetingData.current).length === 0 && Object.keys(meetingData.future).length === 0 ? (
                   <div className="relative z-10 text-center py-24 text-blue-200/60 font-bold text-xl backdrop-blur-md bg-white/5 rounded-3xl border border-white/10">
                      KHÔNG CÓ NHIỆM VỤ TRONG KỲ GIAO BAN NÀY
                   </div>
                ) : (
                   <div className="relative z-10 flex flex-col space-y-8">
                     {/* KẾT QUẢ THỰC HIỆN TRONG KỲ */}
                     <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/15 shadow-2xl">
                       <h3 className="text-xl font-black text-white mb-5 uppercase flex items-center tracking-wide">
                         <span className="p-1.5 bg-green-500/20 border border-green-400/30 rounded-lg mr-2.5">
                           <CheckCircle className="text-green-400" size={20}/>
                         </span>
                         KẾT QUẢ THỰC HIỆN
                       </h3>
                       
                       <div className="flex overflow-x-auto space-x-6 pb-4">
                         {Object.keys(meetingData.current).map(catName => {
                           const tasksInCat = meetingData.current[catName];
                           const completedTasks = tasksInCat.filter(t => t.progress_percent === 100);
                           const overdueTasks = tasksInCat.filter(t => !isRoutine(t) && t.progress_percent < 100 && t.due_date && (parseDateLocal(t.due_date).getTime() < new Date().getTime() || t.progress_percent === 0));
                           const processingTasks = tasksInCat.filter(t => (isRoutine(t) || (t.progress_percent > 0 && t.progress_percent < 100)) && !overdueTasks.includes(t));

                           return (
                             <div 
                               key={catName} 
                               className="min-w-[360px] max-w-[380px] bg-slate-900/40 backdrop-blur-2xl rounded-2xl p-4 border border-white/15 flex flex-col h-max shadow-xl hover:border-white/30 transition-all duration-300"
                             >
                               <h4 className="text-base font-black text-blue-200 mb-4 border-b border-white/10 pb-2.5 flex justify-between items-center">
                                 <span className="truncate pr-2">{catName.toUpperCase()}</span>
                                 <span className="text-xs bg-blue-500/20 border border-blue-400/30 text-blue-200 px-2.5 py-1 rounded-full font-bold whitespace-nowrap">
                                   {tasksInCat.length} việc
                                 </span>
                               </h4>

                               <div className="space-y-4">
                                 {/* CHẬM TIẾN ĐỘ / CẦN ĐÔN ĐỐC */}
                                 {overdueTasks.length > 0 && (
                                    <div className="space-y-2">
                                      <div className="text-xs font-bold text-red-300 uppercase flex items-center tracking-wider">
                                        <AlertTriangle size={14} className="mr-1.5 text-red-400"/> Cần đôn đốc ({overdueTasks.length})
                                      </div>
                                      {overdueTasks.map(t => (
                                        <div 
                                          key={t.id} 
                                          onClick={() => openEditForm(t)} 
                                          className="bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded-xl p-3.5 cursor-pointer backdrop-blur-md transition-all duration-200 hover:scale-[1.02] shadow-lg"
                                        >
                                          <div className="flex justify-between items-start mb-1.5">
                                            <span className="font-bold text-white text-sm leading-snug">{t.title}</span>
                                            <span className="text-red-300 font-black text-xs bg-red-950/60 px-2 py-0.5 rounded-md border border-red-500/30 ml-2">
                                              {t.progress_percent}%
                                            </span>
                                          </div>
                                          <div className="text-[11px] text-red-200/80 mb-1">Thực hiện: {getAssigneeNames(t.assignees)}</div>
                                          <div className="text-[10px] text-red-300/60 font-medium">Hạn chót: {t.due_date}</div>
                                        </div>
                                      ))}
                                    </div>
                                 )}

                                 {/* ĐANG THỰC HIỆN */}
                                 {processingTasks.length > 0 && (
                                    <div className="space-y-2">
                                      <div className="text-xs font-bold text-amber-300 uppercase flex items-center tracking-wider">
                                        <Clock size={14} className="mr-1.5 text-amber-400"/> Đang thực hiện ({processingTasks.length})
                                      </div>
                                      {processingTasks.map(t => (
                                        <div 
                                          key={t.id} 
                                          onClick={() => openEditForm(t)} 
                                          className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 rounded-xl p-3.5 cursor-pointer backdrop-blur-md transition-all duration-200 hover:scale-[1.02] shadow-lg"
                                        >
                                          <div className="flex justify-between items-start mb-1.5">
                                            <span className="font-bold text-white text-sm leading-snug">{t.title}</span>
                                            <span className="text-amber-300 font-black text-xs bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-500/30 ml-2">
                                              {isRoutine(t) ? 'Thường xuyên' : `${t.progress_percent}%`}
                                            </span>
                                          </div>
                                          <div className="text-[11px] text-amber-200/80 mb-1">Thực hiện: {getAssigneeNames(t.assignees)}</div>
                                          <div className="text-[10px] text-amber-300/60 font-medium">Hạn chót: {t.due_date}</div>
                                        </div>
                                      ))}
                                    </div>
                                 )}

                                 {/* ĐÃ XONG */}
                                 {completedTasks.length > 0 && (
                                    <div className="space-y-2 opacity-80 hover:opacity-100 transition-opacity">
                                      <div className="text-xs font-bold text-emerald-300 uppercase flex items-center tracking-wider">
                                        <CheckCircle size={14} className="mr-1.5 text-emerald-400"/> Đã xong ({completedTasks.length})
                                      </div>
                                      {completedTasks.map(t => (
                                        <div 
                                          key={t.id} 
                                          onClick={() => openEditForm(t)} 
                                          className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 rounded-xl p-2.5 cursor-pointer backdrop-blur-md transition-all duration-200 flex justify-between items-center shadow-md"
                                        >
                                          <span className="font-semibold text-emerald-100 text-xs truncate mr-2">{t.title}</span>
                                          <span className="text-emerald-300 font-black text-[10px] bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                                            100%
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                 )}
                               </div>
                             </div>
                           )
                         })}
                       </div>
                     </div>

                     {/* PHƯƠNG HƯỚNG NHIỆM VỤ */}
                     {Object.keys(meetingData.future).length > 0 && (
                       <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/15 shadow-2xl">
                         <h3 className="text-xl font-black text-sky-200 mb-5 uppercase flex items-center tracking-wide">
                           <span className="p-1.5 bg-sky-500/20 border border-sky-400/30 rounded-lg mr-2.5">
                             <Clock className="text-sky-300" size={20}/>
                           </span>
                           PHƯƠNG HƯỚNG THỜI GIAN TỚI
                         </h3>

                         <div className="flex overflow-x-auto space-x-6 pb-4">
                           {Object.keys(meetingData.future).map(catName => {
                             const tasksInCat = meetingData.future[catName];
                             return (
                               <div 
                                 key={catName} 
                                 className="min-w-[360px] max-w-[380px] bg-slate-900/40 backdrop-blur-2xl rounded-2xl p-4 border border-white/15 flex flex-col h-max shadow-xl hover:border-white/30 transition-all duration-300"
                               >
                                 <h4 className="text-base font-bold text-sky-200 mb-3 border-b border-white/10 pb-2.5">
                                   {catName.toUpperCase()}
                                 </h4>
                                 <div className="space-y-2.5">
                                   {tasksInCat.map(t => (
                                      <div 
                                        key={t.id} 
                                        onClick={() => openEditForm(t)} 
                                        className="bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/20 rounded-xl p-3 cursor-pointer backdrop-blur-md transition-all duration-200 hover:scale-[1.02] shadow-md"
                                      >
                                        <div className="font-semibold text-white text-sm mb-1.5 leading-snug">{t.title}</div>
                                        <div className="text-[11px] text-sky-200/70 flex justify-between items-center">
                                          <span className="truncate pr-2">Làm: {getAssigneeNames(t.assignees)}</span>
                                          <span className="text-sky-300 font-bold bg-sky-950/60 px-2 py-0.5 rounded border border-sky-400/30 whitespace-nowrap">
                                            Kết thúc: {t.due_date}
                                          </span>
                                        </div>
                                      </div>
                                   ))}
                                 </div>
                               </div>
                             )
                           })}
                         </div>
                       </div>
                     )}
                   </div>
                )}
             </div>
          </div>
        )}
        {/* ================= TAB THI ĐUA KHEN THƯỞNG ================= */}
        {activeTab === 'emulation' && (
          <div className="space-y-8 animate-fade-in pb-10">
            <h2 className="text-2xl font-black uppercase text-indigo-800 mb-6 flex items-center justify-center border-b border-indigo-200 pb-3"><Target className="mr-2" size={32}/> KẾT QUẢ THI ĐUA XƯỞNG SCVK38</h2>
            
            {/* CHECKBOX CHỌN BỘ PHẬN THAM GIA THI ĐUA */}
            <div className="bg-white p-4 rounded-xl shadow border border-gray-200 mb-6">
               <div className="font-bold text-gray-700 uppercase mb-3"><Users size={18} className="inline mr-1"/> Bộ phận tham gia Bình xét:</div>
               <div className="flex flex-wrap gap-3">
                  {departments.map(d => (
                     <label key={d.id} className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded border border-gray-200 cursor-pointer hover:bg-gray-100">
                        <input type="checkbox" disabled={user.role !== 'admin'} checked={participatingDepts.includes(d.id)} onChange={(e) => {
                           if (e.target.checked) setParticipatingDepts([...participatingDepts, d.id]);
                           else setParticipatingDepts(participatingDepts.filter(id => id !== d.id));
                        }} className="w-4 h-4 text-indigo-600 rounded disabled:opacity-50"/>
                        <span className="text-sm font-semibold text-gray-800">{d.name}</span>
                     </label>
                  ))}
               </div>
            </div>

            {/* DANH SÁCH NHIỆM VỤ ĐỂ CHẤM ĐIỂM */}
            <div className="bg-white p-6 rounded-xl shadow border border-gray-200 mb-8">
                <div className="flex items-center justify-between mb-4 border-b pb-2">
                    <h3 className="font-black text-lg text-gray-800 uppercase"><Edit className="inline mr-2"/> Chi tiết Nhiệm vụ & Chấm điểm Thi đua</h3>
                    <select value={emulationSelectedDept} onChange={(e) => setEmulationSelectedDept(e.target.value)} className="border p-2 rounded text-sm font-bold bg-gray-50 outline-none">
                        <option value="">-- Xem tất cả bộ phận --</option>
                        {departments.filter(d => participatingDepts.includes(d.id)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
                <div className="space-y-3">
                    {tasks.filter(t => !emulationSelectedDept || t.assignees.includes(emulationSelectedDept)).map(t => {
                        const isOverdue = !isRoutine(t) && t.progress_percent < 100 && t.due_date && parseDateLocal(t.due_date).getTime() < new Date().setHours(0, 0, 0, 0);
                        const statusColor = t.progress_percent === 100 ? 'bg-green-100 border-green-300' : (isOverdue ? 'bg-red-100 border-red-300' : 'bg-yellow-100 border-yellow-300');
                        return (
                            <div key={`emul-${t.id}`} className={`p-4 rounded-lg border flex flex-col md:flex-row justify-between items-start md:items-center ${statusColor}`}>
                                <div className="mb-2 md:mb-0">
                                    <div className="font-bold text-gray-800 mb-1">{t.title}</div>
                                    <div className="text-xs text-gray-600 mb-2 font-semibold">Hạn: {t.due_date || 'Không có'} - {t.progress_percent === 100 ? 'Đã xong' : (isOverdue ? 'Chậm tiến độ' : 'Đang thực hiện')}</div>
                                    <div className="flex gap-2">
                                        {(t.additional_data?.bonus_pts > 0) && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-black shadow-sm">+{t.additional_data.bonus_pts}đ</span>}
                                        {(t.additional_data?.penalty_pts > 0) && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-black shadow-sm">-{t.additional_data.penalty_pts}đ</span>}
                                    </div>
                                </div>
                                {user.role === 'admin' && (
                                    <button onClick={() => { setRatingTask(t); setRatingData({ points: (t.additional_data?.bonus_pts || 0) - (t.additional_data?.penalty_pts || 0), reason: t.additional_data?.bonus_reason || t.additional_data?.penalty_reason || '' }); }} className="bg-white border border-gray-300 shadow-sm px-4 py-2 rounded font-black text-xs text-gray-700 hover:bg-gray-100 uppercase transition">Đánh giá / Chấm điểm</button>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* BẢNG TỔNG HỢP VÀ XẾP HẠNG */}
            <div className="bg-yellow-50 p-6 rounded-xl shadow border border-yellow-300 mb-8">
                <h3 className="font-black text-xl text-yellow-900 uppercase mb-6 flex items-center border-b border-yellow-200 pb-2"><Target className="mr-2"/> BẢNG XẾP HẠNG THI ĐUA</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {emulationRanking.slice(0, 3).map((dept, idx) => (
                        <div key={`top-${dept.id}`} className={`p-4 rounded-xl text-center shadow-lg border-b-4 ${idx===0?'bg-gradient-to-b from-yellow-100 to-yellow-200 border-yellow-500':idx===1?'bg-gradient-to-b from-gray-100 to-gray-200 border-gray-400':'bg-gradient-to-b from-orange-100 to-orange-200 border-orange-500'}`}>
                            <div className="text-4xl mb-2">{idx===0?'🏆':idx===1?'🥈':'🥉'}</div>
                            <div className="font-black text-gray-800 text-sm mb-2 h-10 flex items-center justify-center">{dept.name}</div>
                            <div className={`text-3xl font-black ${idx===0?'text-yellow-700':idx===1?'text-gray-700':'text-orange-700'}`}>{dept.score} <span className="text-sm font-bold opacity-70">điểm</span></div>
                        </div>
                    ))}
                </div>

                <table className="w-full text-left text-sm border-collapse bg-white rounded-lg overflow-hidden shadow">
                    <thead className="bg-gray-100 text-gray-700">
                        <tr>
                            <th className="p-3 border-b">Hạng</th><th className="p-3 border-b">Bộ phận</th>
                            <th className="p-3 border-b text-center text-green-600">Sớm</th><th className="p-3 border-b text-center text-blue-600">Đúng</th><th className="p-3 border-b text-center text-red-600">Chậm</th>
                            <th className="p-3 border-b text-right font-black">Điểm Tổng</th>
                        </tr>
                    </thead>
                    <tbody>
                        {emulationRanking.map((dept, index) => (
                            <tr key={dept.id} className="border-b hover:bg-gray-50 transition">
                                <td className="p-3 font-bold text-gray-500">#{index + 1}</td>
                                <td className="p-3 font-bold text-indigo-700">{dept.name}</td>
                                <td className="p-3 text-center font-bold text-green-600">{dept.ahead}</td>
                                <td className="p-3 text-center font-bold text-blue-600">{dept.ontime}</td>
                                <td className="p-3 text-center font-bold text-red-600">{dept.overdue}</td>
                                <td className="p-3 text-right font-black text-lg text-red-700">{dept.score}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* BẢNG TỔNG HỢP TĂNG GIA & BIỂU ĐỒ CHỈ TIÊU */}
            <div className="bg-lime-50 p-6 rounded-xl shadow border border-lime-300 mb-6 mt-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-lime-200 pb-3 gap-4">
                    <h3 className="font-black text-xl text-lime-900 uppercase flex items-center"><PieChart className="mr-2"/>KẾT QUẢ TĂNG GIA SẢN XUẤT</h3>
                    <div className="flex space-x-2">
                        <select value={selectedTargetPeriod} onChange={e=>setSelectedTargetPeriod(e.target.value)} className="border border-lime-400 rounded-lg px-3 py-2 text-sm font-bold text-lime-900 bg-white shadow-sm outline-none focus:ring-2 focus:ring-lime-500">
                            <option value="Q1">Tiến độ Quý 1</option><option value="Q2">Tiến độ Quý 2</option>
                            <option value="Q3">Tiến độ Quý 3</option><option value="Q4">Tiến độ Quý 4</option>
                            <option value="Year">Tiến độ Cả Năm</option>
                        </select>
                        {(user.role === 'admin' || user.department_id === departments.find(d=>d.name.toLowerCase().includes('hành chính'))?.id) && (
                            <button onClick={() => setEditingFarmingTargets(!editingFarmingTargets)} className={`px-4 py-2 rounded-lg font-bold text-sm shadow-sm flex items-center transition ${editingFarmingTargets ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-lime-600 hover:bg-lime-700 text-white'}`}>
                                {editingFarmingTargets ? <X size={16} className="mr-1"/> : <Edit2 size={16} className="mr-1"/>} 
                                {editingFarmingTargets ? 'Đóng form' : 'Sửa Chỉ Tiêu'}
                            </button>
                        )}
                    </div>
                </div>

                {editingFarmingTargets && (
                    <div className="bg-white p-4 rounded-xl shadow-inner border border-lime-300 mb-8 overflow-hidden animate-fade-in">
                        <h4 className="font-black text-lime-800 mb-4 border-b pb-2 uppercase text-sm">Giao chỉ tiêu Hậu cần - Kỳ: {selectedTargetPeriod === 'Year' ? 'Cả Năm' : selectedTargetPeriod}</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-lime-100 text-lime-900">
                                        <th className="p-3 font-bold border-b border-lime-200">Giao cho Bộ phận</th>
                                        <th className="p-3 text-center font-bold border-b border-lime-200 text-green-700">Rau (kg)</th>
                                        <th className="p-3 text-center font-bold border-b border-lime-200 text-orange-600">Củ quả (kg)</th>
                                        <th className="p-3 text-center font-bold border-b border-lime-200 text-red-600">Thịt gia cầm (con)</th>
                                        <th className="p-3 text-center font-bold border-b border-lime-200 text-blue-700">Thịt gia súc (con)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {departments.filter(d => !d.name.toLowerCase().includes('giám đốc') && !d.name.toLowerCase().includes('gđ')).map(d => {
                                        const currentTarget = (farmingTargets[selectedTargetPeriod] || {})[d.id] || {rau:0, cu_qua:0, gia_cam:0, gia_suc:0};
                                        const handleChange = (type, val) => {
                                            setFarmingTargets(prev => ({
                                                ...prev, [selectedTargetPeriod]: { ...(prev[selectedTargetPeriod] || {}), [d.id]: { ...((prev[selectedTargetPeriod] || {})[d.id] || {rau:0, cu_qua:0, gia_cam:0, gia_suc:0}), [type]: parseFloat(val) || 0 } }
                                            }));
                                        };
                                        return (
                                            <tr key={`edit-tgt-${d.id}`} className="border-b hover:bg-lime-50/50">
                                                <td className="p-3 font-bold text-gray-700">{d.name}</td>
                                                <td className="p-2"><input type="number" min="0" value={currentTarget.rau} onChange={e=>handleChange('rau', e.target.value)} className="w-full border border-gray-300 rounded p-2 text-center outline-none focus:ring-2 focus:ring-green-500 font-semibold"/></td>
                                                <td className="p-2"><input type="number" min="0" value={currentTarget.cu_qua} onChange={e=>handleChange('cu_qua', e.target.value)} className="w-full border border-gray-300 rounded p-2 text-center outline-none focus:ring-2 focus:ring-orange-500 font-semibold"/></td>
                                                <td className="p-2"><input type="number" min="0" value={currentTarget.gia_cam} onChange={e=>handleChange('gia_cam', e.target.value)} className="w-full border border-gray-300 rounded p-2 text-center outline-none focus:ring-2 focus:ring-red-500 font-semibold"/></td>
                                                <td className="p-2"><input type="number" min="0" value={currentTarget.gia_suc} onChange={e=>handleChange('gia_suc', e.target.value)} className="w-full border border-gray-300 rounded p-2 text-center outline-none focus:ring-2 focus:ring-blue-500 font-semibold"/></td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3 bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                        <h4 className="text-xl font-black text-gray-700 text-center mb-8 uppercase border-b pb-4">KẾT QUẢ ({selectedTargetPeriod === 'Year' ? 'Năm' : selectedTargetPeriod})</h4>
                        {(() => {
                            const calc = (item) => {
                                const hasTarget = item.target > 0;
                                const percent = hasTarget ? Math.round((item.actual / item.target) * 100) : 0;
                                return { hasTarget, percent, width: Math.min(100, percent) };
                            };
                            const totalItem = farmingSummary.chartData.find(i => i.isTotal);
                            const subItems = farmingSummary.chartData.filter(i => i.isSub);
                            const deptItems = farmingSummary.chartData.filter(i => i.isDept);
                            const deptColor = (p) => p >= 100 ? '#16a34a' : p >= 60 ? '#3b82f6' : p >= 30 ? '#f59e0b' : '#ef4444';
                            const tc = calc(totalItem);
                            return (
                                <>
                                    <div className="mb-6">
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="text-green-700 uppercase font-black text-xl">TOÀN XƯỞNG</span>
                                            <span className="text-base font-bold" style={{ color: totalItem.fill }}>Thực tế: {totalItem.actual} <span className="text-gray-400">/ Chỉ tiêu: {totalItem.target}</span></span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-10 overflow-hidden shadow-inner">
                                            <div className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-4 text-white font-black text-lg" style={{ width: `${tc.width}%`, backgroundColor: totalItem.fill }}>{tc.width > 8 ? `${tc.percent}%` : ''}</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pb-6 mb-6 border-b border-gray-200">
                                        {subItems.map((item, idx) => {
                                            const c = calc(item);
                                            return (
                                                <div key={idx}>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="font-bold text-gray-700">{item.name.replace('↳ Phân loại: ', '')}</span>
                                                        <span className="font-bold" style={{ color: item.fill }}>{item.actual} <span className="text-gray-400 font-semibold">/ {item.target}</span></span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${c.width}%`, backgroundColor: item.fill }}></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <h5 className="text-sm font-black text-gray-600 uppercase mb-4">Tiến độ ban, phân xưởng (% hoàn thành chỉ tiêu)</h5>
                                    <div className="space-y-4">
                                        {deptItems.map((item, idx) => {
                                            const c = calc(item);
                                            const color = deptColor(c.percent);
                                            return (
                                                <div key={item.name} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="font-bold text-gray-800 uppercase text-base flex items-center">
                                                            {item.rank === 1 && item.actual > 0 && <span className="text-xl mr-2" title="Dẫn đầu">🏆</span>}
                                                            {item.name}
                                                        </span>
                                                        <span className="text-sm font-bold text-gray-500">{item.actual} / {item.target}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex-1 bg-gray-200 rounded-full h-7 overflow-hidden shadow-inner">
                                                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${c.width}%`, backgroundColor: color }}></div>
                                                        </div>
                                                        <span className="w-20 text-right text-2xl font-black" style={{ color }}>{c.hasTarget ? `${c.percent}%` : '—'}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    <div className="lg:col-span-2 bg-white p-0 rounded-xl shadow-sm border border-gray-200 overflow-hidden h-fit">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-lime-100 border-b border-lime-200">
                                <tr><th className="p-4 font-black text-lime-900">Bộ phận</th><th className="p-4 text-center font-black text-green-700">Rau</th><th className="p-4 text-center font-black text-orange-600">Củ quả</th><th className="p-4 text-center font-black text-red-600">Thịt gia cầm</th><th className="p-4 text-center font-black text-blue-700">Thịt gia súc</th></tr>
                            </thead>
                            <tbody>
                                {farmingSummary.sortedDepts.map((dept, idx) => (
                                    <tr key={`farm-${dept.id}`} className={`border-b hover:bg-lime-50/50 ${idx === 0 && dept.rau > 0 ? 'bg-yellow-50/30' : ''}`}>
                                        <td className="p-4 font-bold text-gray-700 flex items-center">
                                            {idx === 0 && dept.rau > 0 && <span className="mr-2 text-lg">🏆</span>}
                                            {dept.name}
                                        </td>
                                        <td className="p-4 text-center font-semibold text-green-700">{dept.stats.rau}</td>
                                        <td className="p-4 text-center font-semibold">{dept.stats.cu_qua}</td>
                                        <td className="p-4 text-center font-semibold">{dept.stats.gia_cam}</td>
                                        <td className="p-4 text-center font-semibold">{dept.stats.gia_suc}</td>
                                    </tr>
                                ))}
                                <tr className="bg-gray-50 border-t-2 border-gray-300">
                                    <td className="p-4 font-black text-gray-900 text-right uppercase">TOÀN XƯỞNG:</td>
                                    <td className="p-4 text-center font-black text-green-700 text-lg">{farmingSummary.total.rau}</td>
                                    <td className="p-4 text-center font-black text-orange-600 text-lg">{farmingSummary.total.cu_qua}</td>
                                    <td className="p-4 text-center font-black text-red-700 text-lg">{farmingSummary.total.gia_cam}</td>
                                    <td className="p-4 text-center font-black text-blue-700 text-lg">{farmingSummary.total.gia_suc}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Popup Nhập Điểm Thi Đua */}
            {ratingTask && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                   <form onSubmit={handleSaveRating} className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border-t-8 border-indigo-600">
                      <h3 className="font-black text-lg mb-4 text-indigo-900 border-b pb-2 uppercase">CHẤM ĐIỂM NHIỆM VỤ</h3>
                      <p className="text-sm font-bold text-gray-700 mb-4 bg-gray-100 p-2 rounded border">{ratingTask.title}</p>
                      <div className="space-y-4">
                         <div><label className="block text-xs font-bold text-gray-600 mb-1">Mức điểm (+ / -)</label><input type="number" value={ratingData.points} onChange={e=>setRatingData({...ratingData, points: e.target.value})} className="w-full border p-2.5 rounded font-bold outline-none text-center text-lg focus:ring-2 focus:ring-indigo-500"/></div>
                         <div><label className="block text-xs font-bold text-gray-600 mb-1">Nhận xét / Lý do</label><input type="text" value={ratingData.reason} onChange={e=>setRatingData({...ratingData, reason: e.target.value})} placeholder="Nhập lý do..." className="w-full border p-2.5 rounded outline-none text-sm focus:ring-2 focus:ring-indigo-500"/></div>
                      </div>
                      <div className="flex justify-end space-x-3 mt-6"><button type="button" onClick={()=>setRatingTask(null)} className="px-4 py-2 border rounded font-bold text-gray-600 hover:bg-gray-100 transition">Hủy</button><button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded font-bold shadow hover:bg-indigo-700 transition">Lưu Điểm</button></div>
                   </form>
                </div>
            )}
          </div>
        )}

        {/* ================= TAB CÔNG VIỆC ================= */}
        {(activeTab === 'tasks_mine' || activeTab === 'tasks_all') && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-extrabold text-gray-800 flex items-center"><FileText className="mr-2 text-red-700" size={22} /> {activeTab === 'tasks_mine' ? 'Nhiệm vụ của Bộ phận / Cá nhân' : 'Bảng Điều Hành Toàn Cơ Quan'}</h2>
              {(user.role === 'admin' || user.role === 'manager') && <button onClick={() => { setEditingTask(null); resetForm(); setShowForm(true); }} className="flex items-center bg-red-700 hover:bg-red-800 text-white px-5 py-2.5 rounded-xl shadow-md font-bold text-sm transition"><Plus size={18} className="mr-2"/> Giao việc</button>}
            </div>

            <div className="space-y-4">
              {displayTasks.length === 0 ? <div className="bg-white rounded-xl p-12 text-center text-gray-400 font-medium shadow-sm">Chưa có nhiệm vụ nào.</div> : (
                displayTasks.map(task => {
                  const isCompleted = task.progress_percent === 100;
                  const isOverdue = !isCompleted && !isRoutine(task) && task.due_date && (parseDateLocal(task.due_date).getTime() < new Date().getTime());
                  const isProcessing = !isCompleted && !isOverdue;

                  // THAY ĐỔI MÀU SẮC TRẠNG THÁI THEO YÊU CẦU:
                  // 1. Chậm tiến độ -> Đỏ
                  // 2. Xong (100%) -> Xanh lá
                  // 3. Đang thực hiện -> Vàng
                  let borderCol = 'border-l-yellow-500 bg-yellow-50/40'; 
                  let badgeStyle = 'bg-yellow-500 text-white';
                  let statusLabel = 'Đang thực hiện';

                  if (isCompleted) { 
                    borderCol = 'border-l-green-600 bg-green-50/50'; 
                    badgeStyle = 'bg-green-600 text-white'; 
                    statusLabel = 'Hoàn thành';
                  } else if (isOverdue) { 
                    borderCol = 'border-l-red-600 bg-red-50/60 ring-1 ring-red-300'; 
                    badgeStyle = 'bg-red-600 text-white animate-pulse'; 
                    statusLabel = 'Chậm tiến độ';
                  }

                  const canEdit = checkCanEditTask(task);
                  const totalMp = (task.manpower || []).reduce((s, m) => s + (parseFloat(m.count)||0), 0);
                  const isMineDirectly = task.assignees.includes(user.id);

                  return (
                    <div key={task.id} className={`p-5 rounded-xl border border-gray-200 border-l-8 shadow-sm transition relative ${borderCol}`}>
                      {isOverdue && <div className="absolute -top-3 -right-3 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg flex items-center"><AlertTriangle size={12} className="mr-1"/> CHẬM TIẾN ĐỘ</div>}

                      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="space-y-2 flex-1 w-full">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3 border-gray-200/50">
                            <div className="flex items-center space-x-3">
                                {isMineDirectly && <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider whitespace-nowrap">VIỆC CÁ NHÂN</span>}
                                {!isMineDirectly && task.assignees.includes(user.department_id) && <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider whitespace-nowrap">VIỆC CỦA BỘ PHẬN</span>}
                                <h3 className={`font-bold text-lg ${isCompleted ? 'text-gray-600 line-through' : 'text-gray-900'}`}>{task.title}</h3>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs uppercase font-bold ${badgeStyle} whitespace-nowrap`}>{statusLabel}</span>
                            </div>
                            {isRoutine(task) && <span className="bg-lime-100 text-lime-800 border border-lime-300 px-3 py-1 rounded-full text-xs font-black uppercase whitespace-nowrap">Thường xuyên cả năm</span>}
                            <div className={`flex items-center space-x-3 min-w-[200px] ${isRoutine(task) ? 'hidden' : ''}`}>
                              <div className="flex-1 bg-gray-200 rounded-full h-3.5 overflow-hidden border border-gray-300">
                                <div className={`h-full ${isCompleted ? 'bg-green-600' : (isOverdue ? 'bg-red-600' : 'bg-yellow-500')}`} style={{ width: `${task.progress_percent || 0}%` }}></div>
                              </div>
                              <span className={`font-black text-sm ${isCompleted ? 'text-green-700' : (isOverdue ? 'text-red-700' : 'text-yellow-700')}`}>{task.progress_percent || 0}%</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2 pt-1">
                            {task.additional_data?.category && (<span className="inline-flex items-center bg-gray-100 text-gray-800 px-3 py-1 rounded text-sm font-semibold border"><Layers size={14} className="mr-1.5 text-gray-500"/> {task.additional_data.category} {task.additional_data.sub_category ? ` ➔ ${task.additional_data.sub_category}` : ''}</span>)}
                            {task.target_amount > 0 && (<span className="inline-flex items-center bg-blue-50 text-blue-800 px-3 py-1 rounded text-sm font-semibold border border-blue-200"><BarChart2 size={14} className="mr-1.5 text-blue-600"/>Chỉ tiêu: {task.current_amount || 0} / {task.target_amount} {task.target_unit}</span>)}
                            {totalMp > 0 && (<span className="inline-flex items-center bg-orange-50 text-orange-800 px-3 py-1 rounded text-sm font-semibold border border-orange-200"><Users size={14} className="mr-1.5 text-orange-600"/> Tổng lực lượng: {totalMp} công</span>)}
                            {task.additional_data?.attached_file && (<a href={`${SERVER_URL}${task.additional_data.attached_file}`} target="_blank" rel="noreferrer" className="inline-flex items-center bg-purple-50 text-purple-800 px-3 py-1 rounded text-sm font-bold border border-purple-200 hover:bg-purple-100"><Eye size={16} className="mr-1.5 text-purple-600"/> Tài liệu ({task.additional_data.attached_file_name})</a>)}
                          </div>
                          
                          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 mt-2 bg-white/60 p-3 rounded-lg border border-gray-100">
                            <span className="flex items-center"><Users size={14} className="mr-1 text-red-700"/>Cơ quan chỉ đạo: <b className="ml-1 text-gray-800">{departments.find(d=>d.id===task.additional_data?.directing_dept)?.name || task.additional_data?.directing_dept || departments.find(d=>d.id===task.creator_id)?.name || task.creator_id}</b></span>
                            <span className="flex items-center"><UserCheck size={14} className="mr-1 text-red-700"/>Bộ phận thực hiện: <b className="ml-1 text-blue-800">{getAssigneeNames(task.assignees)}</b></span>
                            <span className="flex items-center"><Calendar size={14} className="mr-1 text-red-700"/>Bắt đầu: <b className="ml-1 text-gray-800">{task.start_date || '---'}</b></span>
                            <span className="flex items-center"><Calendar size={14} className="mr-1 text-red-700"/>Kết thúc: <b className={`ml-1 ${isOverdue ? 'text-red-600 font-black' : 'text-gray-800'}`}>{task.due_date}</b></span>
                            {task.fault_dept && <span className="flex items-center w-full"><AlertTriangle size={14} className="mr-1 text-red-600"/>Trách nhiệm: <b className="ml-1 text-red-700 mr-2">{departments.find(d=>d.id===task.fault_dept)?.name || task.fault_dept}</b> <i className="text-gray-500">Lý do: {task.fault_reason}</i></span>}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 lg:flex-col lg:space-x-0 lg:space-y-2 lg:self-stretch justify-center border-t lg:border-t-0 lg:border-l pt-3 lg:pt-0 lg:pl-4 w-full lg:w-[130px]">
                          {!isCompleted && !isRoutine(task) && canEdit && <button onClick={() => markComplete(task)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 flex-1 lg:w-full rounded-lg text-sm font-bold shadow flex items-center justify-center"><CheckCircle size={16} className="mr-1.5"/> XONG</button>}
                          {canEdit && <button onClick={() => openEditForm(task)} className="bg-gray-800 hover:bg-black text-white p-2.5 flex-1 lg:w-full rounded-lg shadow flex items-center justify-center text-sm font-bold"><Edit size={16} className="mr-1.5"/> Cập nhật / Sửa</button>}
                          {user.role === 'admin' && <button onClick={() => handleDeleteTask(task.id)} className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 p-2 flex-1 lg:w-full rounded-lg shadow-sm flex items-center justify-center text-sm font-bold transition"><Trash2 size={16} className="mr-1.5"/> Xóa</button>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </main>

      {/* FORM CẤP MẬT KHẨU CÁ NHÂN - SỬA LẠI ĐÚNG THEO YÊU CẦU */}
      {showPassModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <form onSubmit={handleChangePassword} className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border-t-8 border-red-700">
            <h3 className="font-black text-lg mb-4 text-red-800 border-b pb-2 uppercase flex items-center"><Key className="mr-2"/> Đổi Mật Khẩu Tài Khoản</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Mật Khẩu Cũ (*)</label>
                <input type="password" required value={passData.old} onChange={e=>setPassData({...passData, old: e.target.value})} className="w-full border p-2.5 rounded outline-none focus:ring-2 focus:ring-red-600 text-sm"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Mật Khẩu Mới (*)</label>
                <input type="password" required value={passData.new} onChange={e=>setPassData({...passData, new: e.target.value})} className="w-full border p-2.5 rounded outline-none focus:ring-2 focus:ring-red-600 text-sm"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nhập Lại Mật Khẩu Mới (*)</label>
                <input type="password" required value={passData.confirm} onChange={e=>setPassData({...passData, confirm: e.target.value})} className="w-full border p-2.5 rounded outline-none focus:ring-2 focus:ring-red-600 text-sm"/>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button type="button" onClick={()=>setShowPassModal(false)} className="px-4 py-2 border rounded font-bold text-gray-600 hover:bg-gray-100">Hủy</button>
              <button type="submit" className="px-6 py-2 bg-red-700 text-white rounded font-bold shadow hover:bg-red-800">Cập Nhật Mật Khẩu</button>
            </div>
          </form>
        </div>
      )}

      {/* FORM GIAO VIỆC & CẬP NHẬT */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border-t-8 border-red-700">
            <div className="p-5 border-b bg-gray-50 flex justify-between items-center"><h2 className="text-xl font-black uppercase text-gray-900 flex items-center"><FileText className="mr-2 text-red-700"/> {editingTask ? 'Cập nhật / Chấm công Nhiệm vụ' : 'Giao Việc / Đề xuất Mới'}</h2><button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-red-600 font-bold text-xl">&times;</button></div>
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              
              <form onSubmit={handleSaveTask} className="p-6 overflow-y-auto flex-1 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                  <div className="md:col-span-2"><label className="block text-xs font-black text-gray-800 uppercase mb-2">Tên công việc / Yêu cầu (*)</label><input type="text" name="title" value={formData.title} onChange={handleFormChange} required disabled={user.role !== 'admin' && editingTask} className="w-full border border-gray-300 p-3 rounded-lg outline-none font-bold text-lg shadow-sm disabled:bg-gray-200 disabled:text-gray-600" /></div>
                  
                  <div><label className="block text-xs font-bold text-blue-800 uppercase mb-2">Mảng Nhiệm vụ</label>
                    <select className="w-full border border-blue-300 p-3 rounded-lg outline-none text-sm font-semibold bg-white disabled:bg-gray-200" name="category" value={formData.additional_data?.category || ''} onChange={handleCategoryChange} disabled={user.role !== 'admin' && editingTask}>
                        <option value="">-- Chọn mảng nhiệm vụ --</option>
                        {availableCategories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs font-bold text-blue-800 uppercase mb-2">Nhánh nhiệm vụ</label>
                    <select className="w-full border border-blue-300 p-3 rounded-lg outline-none text-sm font-semibold bg-white disabled:bg-gray-200" name="sub_category" value={formData.additional_data?.sub_category || ''} onChange={handleAdditionalChange} disabled={(!formData.additional_data?.category) || (user.role !== 'admin' && editingTask)}>
                        <option value="">-- Chọn nhánh chi tiết --</option>
                        {availableCategories.find(c => c.name === formData.additional_data?.category)?.subCategories?.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {!formData.additional_data?.is_farming && (<>
                  <div className="md:col-span-5 grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Bắt đầu (*)</label><input type="date" name="start_date" value={formData.start_date || ''} onChange={handleFormChange} required disabled={user.role !== 'admin' && editingTask} className="w-full border border-gray-300 p-2.5 rounded-lg outline-none text-sm disabled:bg-gray-200" /></div>
                    <div><label className="block text-xs font-bold text-gray-700 uppercase mb-2">Hạn chót (*)</label><input type="date" name="due_date" value={formData.due_date} onChange={handleFormChange} required disabled={user.role !== 'admin' && editingTask} className="w-full border border-gray-300 p-2.5 rounded-lg outline-none text-sm disabled:bg-gray-200" /></div>
                  </div>
                  <div className="md:col-span-7 bg-green-50 p-4 rounded-xl border border-green-200 grid grid-cols-3 gap-3 items-end">
                    <div className="col-span-3 pb-1 border-b border-green-200"><span className="text-xs font-black text-green-800 uppercase flex items-center"><BarChart2 size={14} className="mr-1"/> Đo lường Chỉ tiêu & Kết quả</span></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1">Tổng Chỉ Tiêu</label><input type="number" min="0" step="0.1" name="target_amount" value={formData.target_amount || ''} onChange={handleProgressChange} disabled={user.role !== 'admin' && editingTask} className="w-full border border-gray-300 p-2.5 rounded-lg outline-none font-bold disabled:bg-gray-200" /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1">Đơn vị</label><input type="text" name="target_unit" placeholder="Khẩu, Cái..." value={formData.target_unit || ''} onChange={handleProgressChange} disabled={user.role !== 'admin' && editingTask} className="w-full border border-gray-300 p-2.5 rounded-lg outline-none disabled:bg-gray-200" /></div>
                    <div><label className="block text-xs font-bold text-green-700 mb-1">Đã Đạt Được</label><input type="number" min="0" step="0.1" name="current_amount" value={formData.current_amount || ''} onChange={handleProgressChange} className="w-full border-2 border-green-400 p-2.5 rounded-lg outline-none font-bold text-green-800 bg-green-100/50" /></div>
                    <div className="col-span-3 mt-2 flex items-center space-x-4 bg-white p-3 rounded-lg border border-gray-200">
                      <label className="text-sm font-bold text-gray-800 whitespace-nowrap">Tiến độ:</label>
                      <input type="range" min="0" max="100" name="progress_percent" value={formData.progress_percent || 0} onChange={handleProgressChange} className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-blue-600" />
                      <span className="font-black text-blue-700 w-12 text-right">{formData.progress_percent || 0}%</span>
                    </div>
                  </div>

                  </>)}

                  {/* BẢNG TĂNG GIA & NHIỆM VỤ DÀI HẠN */}
                  <div className="col-span-1 md:col-span-12 bg-lime-50 p-5 rounded-xl border border-lime-300 mt-2">
                      <label className="flex items-center space-x-3 font-black text-lime-900 cursor-pointer text-sm uppercase">
                         <input type="checkbox" checked={formData.additional_data?.is_farming || false} onChange={e => handleAdditionalChange({target: {name: 'is_farming', value: e.target.checked}})} className="w-5 h-5 accent-lime-600"/>
                         <span>Tùy chỉnh: Bảng nhập liệu Tăng gia / Chăn nuôi / Rau sạch (Theo tuần)</span>
                      </label>
                      
                      {formData.additional_data?.is_farming && (
                          <div className="mt-4 space-y-4 max-h-[300px] overflow-y-auto">
                              <p className="text-sm font-bold text-lime-900 bg-lime-100 border border-lime-300 rounded p-2">Nhiệm vụ thường xuyên</p>
                              <p className="text-xs text-lime-700 italic border-b border-lime-200 pb-2">Hệ thống khóa dữ liệu các tuần cũ (quá 2 tuần). Cơ quan chỉ đạo và Admin có quyền chỉnh sửa toàn bộ số liệu.</p>
                              {farmingWeeks.map(wk => (
                                  <div key={wk.key} className="bg-white p-3 rounded shadow-sm border border-lime-200">
                                      <h4 className="font-bold text-sm text-gray-800 mb-2">{wk.label} {wk.locked && <span className="text-red-500 text-xs ml-2 border border-red-200 bg-red-50 px-2 py-0.5 rounded">Đã khóa</span>}</h4>
                                      <table className="w-full text-xs text-left">
                                          <thead className="bg-lime-100"><tr><th className="p-2 border-r border-lime-200">Bộ phận</th><th className="p-2 text-center text-green-700">Rau (kg)</th><th className="p-2 text-center text-orange-600">Củ quả (kg)</th><th className="p-2 text-center text-red-600">Thịt gia cầm (kg/con)</th><th className="p-2 text-center text-blue-700">Thịt gia súc (kg/con)</th></tr></thead>
                                          <tbody>
                                              {formData.assignees.map(deptId => {
                                                  const dName = departments.find(d=>d.id===deptId)?.name; if(!dName) return null;
                                                  
                                                  const isAdmin = user.role === 'admin';
                                                  const isDirectingDept = user.department_id === formData.additional_data?.directing_dept;
                                                  const isMyDeptRow = user.department_id === deptId;
                                                  const canEdit = (isAdmin || isDirectingDept) ? true : (isMyDeptRow && !wk.locked);
                                                  
                                                  const fData = formData.additional_data?.farming_stats?.[wk.key]?.[deptId] || {};
                                                  return (
                                                      <tr key={deptId} className="border-t hover:bg-gray-50">
                                                          <td className="p-2 font-bold text-gray-700 border-r border-gray-100">{dName}</td>
                                                          {['rau', 'cu_qua', 'gia_cam', 'gia_suc'].map(f => (
                                                              <td key={f} className="p-1"><input type="number" min="0" step="0.5" value={fData[f]||''} onChange={e => handleFarmingChange(wk.key, deptId, f, e.target.value)} disabled={!canEdit} placeholder="0" className="w-full text-center border border-gray-300 p-1.5 rounded disabled:bg-gray-200 disabled:cursor-not-allowed outline-none focus:ring-1 focus:ring-lime-500 font-bold"/></td>
                                                          ))}
                                                      </tr>
                                                  )
                                              })}
                                          </tbody>
                                      </table>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
                </div>

                {!formData.additional_data?.is_farming && (
                <div className="bg-orange-50 p-5 rounded-xl border border-orange-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-red-700 uppercase mb-1">Quy trách nhiệm (Nếu Lỗi/Chậm)</label>
                      <select name="fault_dept" value={formData.fault_dept || ''} onChange={handleFormChange} disabled={user.role !== 'admin'} className="w-full border border-red-300 p-2.5 rounded-lg outline-none text-sm font-semibold bg-white disabled:bg-gray-200">
                        <option value="">-- Chọn đầu mối chịu trách nhiệm --</option>
                        {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-red-700 uppercase mb-1">Nguyên nhân</label>
                      <input type="text" name="fault_reason" value={formData.fault_reason || ''} onChange={handleFormChange} disabled={user.role !== 'admin'} placeholder="Ghi rõ lý do..." className="w-full border border-red-300 p-2.5 rounded-lg outline-none text-sm disabled:bg-gray-200" />
                    </div>
                  </div>
                </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(() => {
                    const canEditAssignees = !editingTask || user.role === 'admin' || user.department_id === formData.additional_data?.directing_dept || user.department_id === editingTask?.creator_id;
                    return (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-indigo-700 uppercase mb-2">Cơ quan chỉ đạo</label>
                          <select name="directing_dept" value={formData.additional_data?.directing_dept || ''} onChange={handleAdditionalChange} disabled={!canEditAssignees} className="w-full border border-indigo-300 p-2.5 rounded-lg outline-none text-sm font-semibold bg-white disabled:bg-gray-200 disabled:cursor-not-allowed mb-4">
                              <option value="">-- Chọn cơ quan chỉ đạo --</option>
                              {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                          </select>

                          <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Giao cho Bộ phận (*)</label>
                          <div className="bg-white p-3 border border-gray-300 rounded-xl grid grid-cols-2 gap-2 h-[120px] overflow-y-auto mb-4">
                            {departments.map(dept => (<label key={dept.id} className="flex items-center space-x-2.5 p-1.5 hover:bg-red-50 rounded cursor-pointer border border-transparent"><input type="checkbox" name="assignees" value={dept.id} checked={formData.assignees.includes(dept.id)} onChange={handleFormChange} disabled={!canEditAssignees} className="w-4 h-4 text-red-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"/><span className="text-sm font-medium text-gray-800">{dept.name}</span></label>))}
                          </div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Giao cho Cá nhân</label>
                          <div className="bg-white p-3 border border-gray-300 rounded-xl grid grid-cols-2 gap-2 h-[120px] overflow-y-auto">
                            {allUsers.filter(u => u.role === 'staff').map(u => (<label key={u.id} className="flex items-center space-x-2.5 p-1.5 hover:bg-blue-50 rounded cursor-pointer border border-transparent"><input type="checkbox" name="assignees" value={u.id} checked={formData.assignees.includes(u.id)} onChange={handleFormChange} disabled={!canEditAssignees} className="w-4 h-4 text-blue-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"/><span className="text-sm font-medium text-blue-800">{u.name}</span></label>))}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="bg-purple-50 p-4 rounded-xl border border-purple-200">
                            <label className="block text-xs font-bold text-purple-800 uppercase mb-2 flex items-center"><Paperclip size={14} className="mr-1"/> Tài liệu tham khảo / Văn bản</label>
                            <input type="file" onChange={e => setSelectedFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-100 file:text-purple-700 cursor-pointer hover:file:bg-purple-200" />
                            {formData.additional_data?.attached_file_name && !selectedFile && <p className="text-xs text-purple-600 mt-2 font-semibold">Đã lưu: {formData.additional_data.attached_file_name}</p>}
                          </div>
                          {customFields.map(field => (<div key={field.id}><label className="block text-xs font-bold text-gray-700 uppercase mb-1">{field.label}</label><input type="text" name={field.id} value={formData.additional_data[field.id] || ''} onChange={handleAdditionalChange} className="w-full border border-gray-300 p-2.5 rounded-lg outline-none text-sm font-medium" /></div>))}
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="flex justify-end space-x-4 pt-4 border-t mt-4"><button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-100">ĐÓNG</button><button type="submit" className="px-10 py-3 bg-red-700 hover:bg-red-800 text-white rounded-xl font-black shadow-lg"><Save className="mr-2 inline"/> CẬP NHẬT LÊN HỆ THỐNG</button></div>
              </form>

              {editingTask && activeTab !== 'meeting' && (
                <div className="w-full lg:w-[320px] bg-gray-50 border-t lg:border-t-0 lg:border-l border-gray-300 p-4 overflow-y-auto">
                  <h3 className="font-black text-sm uppercase text-gray-800 mb-4 flex items-center border-b pb-2"><History size={16} className="mr-1.5"/> Lịch sử Cập nhật</h3>
                  {editingTask.history_log && editingTask.history_log.length > 0 ? (
                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gray-300">
                      {editingTask.history_log.map((log, i) => (
                        <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className="flex items-center justify-center w-3 h-3 rounded-full border border-white bg-blue-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
                          <div className="w-[calc(100%-1.5rem)] md:w-[calc(50%-1rem)] p-2 rounded bg-white shadow-sm border border-gray-200">
                            <div className="font-bold text-gray-900 text-[10px] mb-1">{log.user}</div>
                            <div className="text-[9px] text-gray-400 mb-1">{log.time}</div>
                            <div className="text-[10px] text-blue-700 font-semibold">{log.action}</div>
                            {log.details && <div className="text-[10px] text-gray-600 mt-1 italic border-t pt-1 break-words leading-tight">{log.details}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-gray-500 italic">Chưa có lịch sử thay đổi.</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
