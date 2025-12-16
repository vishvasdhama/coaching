const fs = require('fs');
const path = require('path');

function csvEscapeCell(c){ return '"'+String(c===null||c===undefined?'':c).replace(/"/g,'""')+'"'; }

function writeCsv(filename, rows){
  const out = rows.map(r=>r.map(csvEscapeCell).join(',')).join('\n');
  fs.writeFileSync(filename, out, 'utf8');
  console.log('WROTE', filename);
}

function loadJsonSafe(p){ if (!fs.existsSync(p)) return null; try{ return JSON.parse(fs.readFileSync(p,'utf8')); }catch(e){ return null;} }

const outDir = path.join(__dirname, '..', 'test-output'); if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

// Prefer server exports
let students = loadJsonSafe(path.join(__dirname,'..','server','exports','students.json'));
if (!students) students = loadJsonSafe(path.join(__dirname,'..','server','seed_data.json')) && loadJsonSafe(path.join(__dirname,'..','server','seed_data.json')).students;
if (!students) students = [];

// attendance and testResults likely not in server exports; we'll emit No records if missing
// Admin-level exports (all classes)
const attRows = [['rollNo','name','class','date','status','remarks']];
students.forEach(s=>{
  if (Array.isArray(s.attendance) && s.attendance.length>0){
    s.attendance.forEach(a=> attRows.push([s.id,s.name,s.class,a.date||'',a.status||'',a.remarks||'']));
  } else {
    attRows.push([s.id,s.name,s.class,'','No records','']);
  }
});
writeCsv(path.join(outDir,'attendance_all_generated.csv'), attRows);

const marksRows = [['rollNo','name','class','testDate','subject','marks','maxMarks','remarks']];
students.forEach(s=>{
  if (Array.isArray(s.testResults) && s.testResults.length>0){
    s.testResults.forEach(t=> marksRows.push([s.id,s.name,s.class,t.date||'',t.subject||'',t.marks!=null?t.marks:'',t.maxMarks!=null?t.maxMarks:'',t.remarks||'']));
  } else {
    marksRows.push([s.id,s.name,s.class,'','','','','No tests']);
  }
});
writeCsv(path.join(outDir,'marks_all_generated.csv'), marksRows);

console.log('Done.');
