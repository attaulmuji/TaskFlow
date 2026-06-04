let tasks = JSON.parse(localStorage.getItem('taskflow_v1') || '[]');
let filter = 'all', dayFilter = '';

const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Set default date and time to now
function setDefaultDT() {
  const n = new Date();
  const yyyy = n.getFullYear();
  const mm  = String(n.getMonth()+1).padStart(2,'0');
  const dd  = String(n.getDate()).padStart(2,'0');
  const hh  = String(n.getHours()).padStart(2,'0');
  const min = String(n.getMinutes()).padStart(2,'0');
  document.getElementById('task-date').value = `${yyyy}-${mm}-${dd}`;
  document.getElementById('task-time').value = `${hh}:${min}`;
}
setDefaultDT();

// Live clock
function tick() {
  const n = new Date();
  document.getElementById('live-clock').textContent =
    String(n.getHours()).padStart(2,'0') + ':' +
    String(n.getMinutes()).padStart(2,'0') + ':' +
    String(n.getSeconds()).padStart(2,'0');
}
tick();
setInterval(tick, 1000);

// Save to localStorage
function save() {
  localStorage.setItem('taskflow_v1', JSON.stringify(tasks));
}

// Format date for display
function fmtDate(dateStr, timeStr) {
  if (!dateStr) return timeStr || '';
  const d = new Date(dateStr + 'T' + (timeStr || '00:00'));
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}${timeStr ? ' • ' + timeStr : ''}`;
}

// Check if task is overdue
function isOverdue(dateStr, timeStr) {
  if (!dateStr) return false;
  return new Date(dateStr + 'T' + (timeStr || '23:59')) < new Date();
}

// Check if task is due today
function isToday(dateStr) {
  if (!dateStr) return false;
  const t = new Date(), d = new Date(dateStr);
  return t.getFullYear()===d.getFullYear() && t.getMonth()===d.getMonth() && t.getDate()===d.getDate();
}

// Add a new task
function addTask() {
  const inp = document.getElementById('task-input');
  const text = inp.value.trim();
  if (!text) { inp.focus(); return; }
  const priority = document.querySelector('input[name="priority"]:checked').value;
  const date = document.getElementById('task-date').value;
  const time = document.getElementById('task-time').value;
  tasks.unshift({ id: Date.now(), text, priority, done: false, date, time });
  inp.value = '';
  setDefaultDT();
  save();
  buildDayChips();
  render();
}

// Toggle task done/undone
function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (t) { t.done = !t.done; save(); render(); }
}

// Delete a task
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  save();
  buildDayChips();
  render();
}

// Set status filter
function setFilter(f, btn) {
  filter = f;
  document.querySelectorAll('.filter-tabs .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  render();
}

// Set day filter
function setDayFilter(d, btn) {
  dayFilter = d;
  document.querySelectorAll('.day-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  render();
}

// Build day filter chips
function buildDayChips() {
  const dates = [...new Set(tasks.map(t => t.date).filter(Boolean))].sort();
  const wrap = document.getElementById('day-filter');
  wrap.innerHTML = `<button class="day-chip ${dayFilter===''?'active':''}" onclick="setDayFilter('',this)">All Days</button>`;
  dates.forEach(d => {
    const btn = document.createElement('button');
    btn.className = 'day-chip' + (dayFilter===d?' active':'');
    btn.textContent = fmtDate(d,'');
    btn.onclick = function(){ setDayFilter(d,this); };
    wrap.appendChild(btn);
  });
}

// Render task list and stats
function render() {
  const list  = document.getElementById('task-list');
  const empty = document.getElementById('empty-state');
  const done  = tasks.filter(t=>t.done).length;
  const total = tasks.length;
  const pct   = total ? Math.round(done/total*100) : 0;

  document.getElementById('num-total').textContent = total;
  document.getElementById('num-done').textContent  = done;
  document.getElementById('num-left').textContent  = total - done;
  document.getElementById('pct').textContent       = pct + '%';
  document.getElementById('progress-fill').style.width = pct + '%';

  let vis = tasks;
  if (filter==='active')  vis = vis.filter(t=>!t.done);
  if (filter==='done')    vis = vis.filter(t=>t.done);
  if (filter==='overdue') vis = vis.filter(t=>!t.done && isOverdue(t.date,t.time));
  if (filter==='today')   vis = vis.filter(t=>isToday(t.date));
  if (dayFilter)          vis = vis.filter(t=>t.date===dayFilter);

  if (!vis.length) { list.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display='none';

  const pMap = {high:'p-high', med:'p-med', low:'p-low'};
  const pLbl = {high:'🔴 High', med:'🟠 Medium', low:'🟢 Low'};

  list.innerHTML = vis.map((t,i) => {
    const ov  = !t.done && isOverdue(t.date,t.time);
    const tod = isToday(t.date);
    const dtClass = ov ? 'overdue-label' : (tod ? 'today-label' : '');
    const dtIcon  = ov ? '⚠️ ' : (tod ? '📅 ' : '🗓 ');
    const dtText  = t.date ? dtIcon + fmtDate(t.date, t.time) : (t.time || '');
    const cc = t.done ? 'done' : (ov ? 'overdue' : '');
    return `<div class="task-card ${cc}" style="animation-delay:${i*.04}s">
      <button class="check-btn" onclick="toggleTask(${t.id})">✓</button>
      <div class="task-info">
        <div class="task-text">${esc(t.text)}</div>
        <div class="task-meta">
          <span class="priority-tag ${pMap[t.priority]}">${pLbl[t.priority]}</span>
          ${dtText?`<span class="task-datetime ${dtClass}">${dtText}</span>`:''}
        </div>
      </div>
      <button class="delete-btn" onclick="deleteTask(${t.id})">🗑</button>
    </div>`;
  }).join('');
}

// Escape HTML
function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Enter key to add task
document.getElementById('task-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});

// Init
buildDayChips();
render();
