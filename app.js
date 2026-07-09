// --- Default Textarea Seed Data ---
const sampleBetMessage = `de dau.1=10k.21.22.23.24.26.28.29=.10k.

lo 94=25. 00 68 72 05=5.

de 22=15. 77 020 29 30=10. 12 191=50. 010 121=25

de dau 1=5. 56 41 09 505 00 40=10.

de 949-656-858-181-838-141-939-595-121-343-292-171 x 20k

lo 171 -656 x 10d

lo 262=5.

de 353 141 262 47 48 98 595 373 191 50=20. 28 98 99 010 96=10.
dau 0=25. dit 0=5.

lo 50 55=5. 565=10.

de 05 99=30. 565 363=25.  22 33 91=20. 20 90 21=15. 42 51 010=10. lip=15. dit 0=20. kep lech=10`;

document.getElementById('msg-before').value = sampleBetMessage;

// --- Tab Management ---
const navLinks = document.querySelectorAll('.top-nav .nav-link');
const tabPanes = document.querySelectorAll('.tab-content');

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        const tabId = link.getAttribute('data-tab');
        if (!tabId) return; // For the "Tắt" button
        
        e.preventDefault();
        
        // Update Nav Menu UI
        navLinks.forEach(item => item.classList.remove('active'));
        link.classList.add('active');
        
        // Show active pane
        tabPanes.forEach(pane => pane.classList.remove('active'));
        document.getElementById(`${tabId}-pane`).classList.add('active');
        
        // If switching to dictionary tab, refresh view
        if (tabId === 'tudien') {
            loadDictionaryTable();
        }
    });
});

// --- Textarea Line Numbers Logic ---
const beforeTextarea = document.getElementById('msg-before');
const beforeLineNumbers = document.getElementById('ln-before');
const afterTextarea = document.getElementById('msg-after');
const afterLineNumbers = document.getElementById('ln-after');

function updateLineNumbers(textarea, lineContainer) {
    const lines = textarea.value.split('\n');
    let numberHTML = '';
    for (let i = 1; i <= Math.max(lines.length, 12); i++) {
        numberHTML += `<div>${i}</div>`;
    }
    lineContainer.innerHTML = numberHTML;
}

// Sync Scroll
function syncScroll(textarea, lineContainer) {
    lineContainer.scrollTop = textarea.scrollTop;
}

beforeTextarea.addEventListener('input', () => {
    updateLineNumbers(beforeTextarea, beforeLineNumbers);
});
beforeTextarea.addEventListener('scroll', () => {
    syncScroll(beforeTextarea, beforeLineNumbers);
});

afterTextarea.addEventListener('scroll', () => {
    syncScroll(afterTextarea, afterLineNumbers);
});

// Initialize line numbers on load
updateLineNumbers(beforeTextarea, beforeLineNumbers);
updateLineNumbers(afterTextarea, afterLineNumbers);

// --- Local Dictionary Database (Synced with Server File nhaptat.txt) ---
let nhaptatFileShorthands = {};

async function loadNhaptatTxt() {
    try {
        const response = await fetch('dict_api.asp?action=get');
        if (!response.ok) return;
        const data = await response.json();
        nhaptatFileShorthands = {};
        Object.entries(data).forEach(([k, v]) => {
            // Reformat dots to comma-spaces for display
            nhaptatFileShorthands[k] = v.replace(/\./g, ', ');
        });
        console.log('Loaded definitions from nhaptat.txt successfully:', Object.keys(nhaptatFileShorthands).length);
        
        // Refresh Table view if active
        const activeTab = document.querySelector('.top-nav .nav-link.active');
        if (activeTab && activeTab.getAttribute('data-tab') === 'tudien') {
            renderDictionaryTable();
        }
    } catch (err) {
        console.warn('nhaptat.txt load warning (might be offline):', err);
    }
}

// Perform Migration of Local Storage dictionary (if any) to Server nhaptat.txt
async function migrateLocalStorageDict() {
    const rawDict = localStorage.getItem('lottery_dictionary');
    if (rawDict) {
        try {
            console.log('Migrating existing LocalStorage dictionary to server...');
            const response = await fetch('dict_api.asp?action=merge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: rawDict
            });
            if (response.ok) {
                const res = await response.json();
                if (res.status === 'success') {
                    console.log('Migration successful!');
                    localStorage.removeItem('lottery_dictionary');
                }
            }
        } catch (err) {
            console.error('Migration failed:', err);
        }
    }
    // Fetch latest definitions
    await loadNhaptatTxt();
}
migrateLocalStorageDict();

// Backwards-compatible helper
function getDictionary() {
    return nhaptatFileShorthands;
}

// Dictionary UI functions
function loadDictionaryTable(filterText = '') {
    // Just refresh from server, it will trigger render
    loadNhaptatTxt();
}

function renderDictionaryTable(filterText = '') {
    const tbody = document.getElementById('dict-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const sortedKeys = Object.keys(nhaptatFileShorthands).sort();
    
    sortedKeys.forEach(key => {
        if (filterText && !key.includes(filterText.toLowerCase())) return;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 600; color: #2b6cb0;">${escapeHtml(key)}</td>
            <td style="font-family: monospace; font-size: 13px;">${escapeHtml(nhaptatFileShorthands[key])}</td>
            <td style="text-align: center;">
                <button class="delete-btn" onclick="deleteDictWord('${escapeHtml(key)}')">Xóa</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function addDictWord() {
    const keyInput = document.getElementById('dict-key');
    const valInput = document.getElementById('dict-val');
    
    const key = keyInput.value.trim().toLowerCase();
    const val = valInput.value.trim();
    
    if (!key || !val) return;
    
    try {
        const formData = new FormData();
        formData.append('key', key);
        formData.append('val', val);
        
        const response = await fetch('dict_api.asp?action=save', {
            method: 'POST',
            body: formData
        });
        if (response.ok) {
            const res = await response.json();
            if (res.status === 'success') {
                keyInput.value = '';
                valInput.value = '';
                await loadNhaptatTxt();
                alert(`Đã lưu cụm viết tắt "${key}" thành công vào máy chủ!`);
            } else {
                alert('Lỗi lưu từ điển: ' + res.message);
            }
        }
    } catch (err) {
        alert('Không thể kết nối tới máy chủ để lưu từ điển!');
    }
}

async function deleteDictWord(key) {
    if (!confirm(`Bạn có chắc muốn xóa cụm viết tắt "${key}"?`)) return;
    
    try {
        const formData = new FormData();
        formData.append('key', key);
        
        const response = await fetch('dict_api.asp?action=delete', {
            method: 'POST',
            body: formData
        });
        if (response.ok) {
            const res = await response.json();
            if (res.status === 'success') {
                await loadNhaptatTxt();
            } else {
                alert('Lỗi xóa từ điển: ' + res.message);
            }
        }
    } catch (err) {
        alert('Không thể kết nối tới máy chủ để xóa từ điển!');
    }
}

function filterDict() {
    const query = document.getElementById('dict-search').value;
    renderDictionaryTable(query);
}

// --- Raw Text Dictionary Editing ---
let currentDictMode = 'table';

function setDictMode(mode) {
    currentDictMode = mode;
    const btnTable = document.getElementById('btn-dict-table');
    const btnRaw = document.getElementById('btn-dict-raw');
    const tableView = document.getElementById('dict-table-view');
    const rawView = document.getElementById('dict-raw-view');
    
    if (mode === 'table') {
        btnTable.classList.add('active');
        btnRaw.classList.remove('active');
        tableView.style.display = 'grid';
        rawView.style.display = 'none';
        loadDictionaryTable();
    } else {
        btnTable.classList.remove('active');
        btnRaw.classList.add('active');
        tableView.style.display = 'none';
        rawView.style.display = 'block';
        loadRawDict();
    }
}

async function loadRawDict() {
    const textarea = document.getElementById('dict-raw-textarea');
    textarea.value = 'Đang tải dữ liệu từ máy chủ...';
    try {
        const response = await fetch('dict_api.asp?action=getraw');
        if (response.ok) {
            const rawText = await response.text();
            textarea.value = rawText;
        } else {
            textarea.value = 'Lỗi tải tệp tin từ máy chủ!';
        }
    } catch (err) {
        textarea.value = 'Lỗi kết nối tới máy chủ!';
    }
}

async function saveRawDict() {
    const textarea = document.getElementById('dict-raw-textarea');
    const rawText = textarea.value;
    
    if (!confirm('Bạn có chắc chắn muốn ghi đè toàn bộ tệp nhaptat.txt trên máy chủ bằng nội dung này?')) {
        return;
    }
    
    try {
        const response = await fetch('dict_api.asp?action=saveraw', {
            method: 'POST',
            body: rawText
        });
        if (response.ok) {
            const res = await response.json();
            if (res.status === 'success') {
                alert('Đã lưu văn bản thô thành công lên máy chủ!');
                await loadNhaptatTxt();
            } else {
                alert('Lỗi lưu văn bản thô: ' + res.message);
            }
        }
    } catch (err) {
        alert('Không thể kết nối tới máy chủ để lưu văn bản thô!');
    }
}

// --- Text Parser Logic (Chuẩn Hóa Tin nhắn) ---
let parsedBetsGlobal = []; // Stores parsed bets for stats, balancing, and win/loss calculations

// --- Shorthands Database from lk/index.html ---
const shorthands = {
  "cc": "00.22.44.66.88.02.20.04.40.06.60.08.80.242.262.282.464.484.686",
  "cl": "01.03.05.07.09.21.23.25.27.29.41.43.45.47.49.61.63.65.67.69.81.83.85.87.89",
  "lc": "10.12.14.16.18.30.32.34.36.38.50.52.54.56.58.70.72.74.76.78.90.92.94.96.98",
  "ll": "11.33.55.77.99.131.151.171.191.353.373.393.575.595.797",
  "d0": "00.01.02.03.04.05.06.07.08.09",
  "d1": "10.11.12.13.14.15.16.17.18.19",
  "d2": "20.21.22.23.24.25.26.27.28.29",
  "d3": "30.31.32.33.34.35.36.37.38.39",
  "d4": "40.41.42.43.44.45.46.47.48.49",
  "d5": "50.51.52.53.54.55.56.57.58.59",
  "d6": "60.61.62.63.64.65.66.67.68.69",
  "d7": "70.71.72.73.74.75.76.77.78.79",
  "d8": "80.81.82.83.84.85.86.87.88.89",
  "d9": "90.91.92.93.94.95.96.97.98.99",
  "d'0": "00.10.20.30.40.50.60.70.80.90",
  "d'1": "01.11.21.31.41.51.61.71.81.91",
  "d'2": "02.12.22.32.42.52.62.72.82.92",
  "d'3": "03.13.23.33.43.53.63.73.83.93",
  "d'4": "04.14.24.34.44.54.64.74.84.94",
  "d'5": "05.15.25.35.45.55.65.75.85.95",
  "d'6": "06.16.26.36.46.56.66.76.86.96",
  "d'7": "07.17.27.37.47.57.67.77.87.97",
  "d'8": "08.18.28.38.48.58.68.78.88.98",
  "d'9": "09.19.29.39.49.59.69.79.89.99",
  "h05": "050.55.00",
  "h50": "050.55.00",
  "h55": "050.55.00",
  "h00": "050.55.00",
  "h16": "161.66.11",
  "h61": "161.66.11",
  "h66": "161.66.11",
  "h11": "161.66.11",
  "h27": "272.22.77",
  "h72": "272.22.77",
  "h22": "272.22.77",
  "h77": "272.22.77",
  "h38": "383.33.88",
  "h83": "383.33.88",
  "h33": "383.33.88",
  "h88": "383.33.88",
  "h49": "494.44.99",
  "h94": "494.44.99",
  "h44": "494.44.99",
  "h99": "494.44.99",
  "h01": "01.10.06.60.51.15.56.65",
  "h10": "01.10.06.60.51.15.56.65",
  "h06": "01.10.06.60.51.15.56.65",
  "h60": "01.10.06.60.51.15.56.65",
  "h15": "01.10.06.60.51.15.56.65",
  "h51": "01.10.06.60.51.15.56.65",
  "h56": "01.10.06.60.51.15.56.65",
  "h65": "01.10.06.60.51.15.56.65",
  "h02": "02.20.07.70.52.25.57.75",
  "h20": "02.20.07.70.52.25.57.75",
  "h07": "02.20.07.70.52.25.57.75",
  "h70": "02.20.07.70.52.25.57.75",
  "h52": "02.20.07.70.52.25.57.75",
  "h25": "02.20.07.70.52.25.57.75",
  "h57": "02.20.07.70.52.25.57.75",
  "h75": "02.20.07.70.52.25.57.75",
  "h03": "03.30.08.80.53.35.58.85",
  "h30": "03.30.08.80.53.35.58.85",
  "h08": "03.30.08.80.53.35.58.85",
  "h80": "03.30.08.80.53.35.58.85",
  "h53": "03.30.08.80.53.35.58.85",
  "h35": "03.30.08.80.53.35.58.85",
  "h58": "03.30.08.80.53.35.58.85",
  "h85": "03.30.08.80.53.35.58.85",
  "h04": "04.40.09.90.54.45.59.95",
  "h40": "04.40.09.90.54.45.59.95",
  "h09": "04.40.09.90.54.45.59.95",
  "h90": "04.40.09.90.54.45.59.95",
  "h54": "04.40.09.90.54.45.59.95",
  "h45": "04.40.09.90.54.45.59.95",
  "h59": "04.40.09.90.54.45.59.95",
  "h95": "04.40.09.90.54.45.59.95",
  "h12": "121.171.626.676",
  "h21": "121.171.626.676",
  "h17": "121.171.626.676",
  "h71": "121.171.626.676",
  "h62": "121.171.626.676",
  "h26": "121.171.626.676",
  "h67": "121.171.626.676",
  "h76": "121.171.626.676",
  "h13": "131.181.636.686",
  "h31": "131.181.636.686",
  "h18": "131.181.636.686",
  "h81": "131.181.636.686",
  "h63": "131.181.636.686",
  "h36": "131.181.636.686",
  "h68": "131.181.636.686",
  "h86": "131.181.636.686",
  "h14": "141.191.646.696",
  "h41": "141.191.646.696",
  "h19": "141.191.646.696",
  "h91": "141.191.646.696",
  "h64": "141.191.646.696",
  "h46": "141.191.646.696",
  "h69": "141.191.646.696",
  "h96": "141.191.646.696",
  "h23": "232.282.737.787",
  "h32": "232.282.737.787",
  "h28": "232.282.737.787",
  "h82": "232.282.737.787",
  "h73": "232.282.737.787",
  "h37": "232.282.737.787",
  "h78": "232.282.737.787",
  "h87": "232.282.737.787",
  "h24": "242.292.747.797",
  "h42": "242.292.747.797",
  "h29": "242.292.747.797",
  "h92": "242.292.747.797",
  "h74": "242.292.747.797",
  "h47": "242.292.747.797",
  "h79": "242.292.747.797",
  "h97": "242.292.747.797",
  "h34": "343.393.848.898",
  "h43": "343.393.848.898",
  "h39": "343.393.848.898",
  "h93": "343.393.848.898",
  "h84": "343.393.848.898",
  "h48": "343.393.848.898",
  "h89": "343.393.848.898",
  "h98": "343.393.848.898",
  "tongto": "05.06.07.08.09.14.15.16.17.18.23.24.25.26.27.32.33.34.35.36.41.42.43.44.45.50.51.52.53.54.60.61.62.63.69.70.71.72.78.79.80.81.87.88.89.90.96.97.98.99",
  "tongbe": "00.01.02.03.04.10.11.12.13.19.20.21.22.28.29.30.31.37.38.39.40.46.47.48.49.55.56.57.58.59.64.65.66.67.68.73.74.75.76.77.82.83.84.85.86.91.92.93.94.95",
  "tongle": "01.03.05.07.09.10.12.14.16.18.21.23.25.27.29.30.32.34.36.38.41.43.45.47.49.50.52.54.56.58.61.63.65.67.69.70.72.74.76.78.81.83.85.87.89.90.92.94.96.98",
  "tongchan": "00.02.04.06.08.11.13.15.17.19.20.22.24.26.28.31.33.35.37.39.40.42.44.46.48.51.53.55.57.59.60.62.64.66.68.71.73.75.77.79.80.82.84.86.88.91.93.95.97.99",
  "toto": "55.66.77.88.99.565.575.585.595.676.686.696.787.797.898",
  "tobe": "90.91.92.93.94.80.81.82.83.84.70.71.72.73.74.60.61.62.63.64.50.51.52.53.54",
  "beto": "05.06.07.08.09.15.16.17.18.19.25.26.27.28.29.35.36.37.38.39.45.46.47.48.49",
  "bebe": "00.11.22.33.44.01.10.02.20.03.30.04.40.121.131.141.232.242.343",
  "dauto": "50.51.52.53.54.55.56.57.58.59.60.61.62.63.64.65.66.67.68.69.70.71.72.73.74.75.76.77.78.79.80.81.82.83.84.85.86.87.88.89.90.91.92.93.94.95.96.97.98.99",
  "daube": "00.01.02.03.04.05.06.07.08.09.10.11.12.13.14.15.16.17.18.19.20.21.22.23.24.25.26.27.28.29.30.31.32.33.34.35.36.37.38.39.40.41.42.43.44.45.46.47.48.49",
  "daule": "10.11.12.13.14.15.16.17.18.19.30.31.32.33.34.35.36.37.38.39.50.51.52.53.54.55.56.57.58.59.70.71.72.73.74.75.76.77.78.79.90.91.92.93.94.95.96.97.98.99",
  "dauchan": "00.01.02.03.04.05.06.07.08.09.20.21.22.23.24.25.26.27.28.29.40.41.42.43.44.45.46.47.48.49.60.61.62.63.64.65.66.67.68.69.80.81.82.83.84.85.86.87.88.89",
  "ditchan": "00.02.04.06.08.10.12.14.16.18.20.22.24.26.28.30.32.34.36.38.40.42.44.46.48.50.52.54.56.58.60.62.64.66.68.70.72.74.76.78.80.82.84.86.88.90.92.94.96.98",
  "ditle": "01.03.05.07.09.11.13.15.17.19.21.23.25.27.29.31.33.35.37.39.41.43.45.47.49.51.53.55.57.59.61.63.65.67.69.71.73.75.77.79.81.83.85.87.89.91.93.95.97.99",
  "ditbe": "00.01.02.03.04.10.11.12.13.14.20.21.22.23.24.30.31.32.33.34.40.41.42.43.44.50.51.52.53.54.60.61.62.63.64.70.71.72.73.74.80.81.82.83.84.90.91.92.93.94",
  "ditto": "05.06.07.08.09.15.16.17.18.19.25.26.27.28.29.35.36.37.38.39.45.46.47.48.49.55.56.57.58.59.65.66.67.68.69.75.76.77.78.79.85.86.87.88.89.95.96.97.98.99"
};

function normalizeShorthandToken(token) {
    let t = token.trim().toLowerCase().replace(/[’‘ʼ＇`]/g, "'");
    const dauMatch = t.match(/^dau(\d)$/);
    if (dauMatch) return 'd' + dauMatch[1];
    const ditMatch = t.match(/^dit(\d)$/);
    if (ditMatch) return "d'" + ditMatch[1];
    const heBoMatch = t.match(/^(he|bo)(\d{1,2})$/);
    if (heBoMatch) {
        let num = heBoMatch[2];
        if (num.length === 1) num = '0' + num;
        return 'h' + num;
    }
    const aliases = {
        'chanle': 'cl',
        'lechan': 'lc',
        'chanchan': 'cc',
        'lele': 'll',
        'dc': 'dauchan',
        'dl': 'daule',
        'dt': 'dauto',
        'db': 'daube',
        'tb': 'tobe',
        'tt': 'toto',
        'bt': 'beto',
        'bb': 'bebe',
        'tc': 'tongchan',
        'tl': 'tongle'
    };
    return aliases[t] || t;
}

function resolveShorthands(numbersString) {
    let s = numbersString;
    
    // Load custom dictionary and normalize keys to support backwards compatibility
    const customShortcuts = {};
    
    // 1. Populate default nhaptat.txt shorthands
    Object.entries(nhaptatFileShorthands).forEach(([k, v]) => {
        const lowerK = k.trim().toLowerCase();
        customShortcuts[lowerK] = v;
        customShortcuts[lowerK.replace(/\s+/g, '')] = v;
        customShortcuts[lowerK.replace(/_/g, '')] = v;
    });
    
    // 2. Populate and override with user custom dictionary
    const rawDict = getDictionary();
    Object.entries(rawDict).forEach(([k, v]) => {
        const lowerK = k.trim().toLowerCase();
        customShortcuts[lowerK] = v;
        customShortcuts[lowerK.replace(/\s+/g, '')] = v;
        customShortcuts[lowerK.replace(/_/g, '')] = v;
    });

    const combinedRegex = /(dau|dit|d'|d|he|bo|t|cham)([0-9]{1,2})((?:[.,\-\s]+[0-9]{1,2})+)/gi;
    s = s.replace(combinedRegex, (match, prefix, firstDigit, rest) => {
        const digits = rest.split(/[^0-9]+/).filter(Boolean);
        const expanded = [prefix + firstDigit, ...digits.map(d => prefix + d)];
        return expanded.join(',');
    });

    const parts = s.split(/([.,\-\s]+)/);
    const resolvedParts = parts.map(part => {
        const trimmed = part.trim().toLowerCase();
        if (!trimmed) return part;
        if (customShortcuts[trimmed]) return customShortcuts[trimmed];
        const normalized = normalizeShorthandToken(part);
        if (customShortcuts[normalized]) return customShortcuts[normalized];
        if (shorthands[normalized]) return shorthands[normalized];
        return part;
    });
    return resolvedParts.join('');
}

function parseNumbersFromBetString(numbersString, betType) {
    const segments = numbersString.split(/[.,\-\s]+/).filter(s => s.length > 0);
    const numbers = []; 
    segments.forEach(seg => {
        if (!/^\d+$/.test(seg)) return;
        if (betType === 'de' || betType === 'lo') {
            if (seg.length === 2) {
                numbers.push(seg);
            } else if (seg.length === 3) {
                if (seg.charAt(0) === seg.charAt(2)) {
                    numbers.push(seg.substring(0, 2));
                    numbers.push(seg.substring(1, 3));
                }
            }
        } else if (betType === 'xien' || betType === 'xienquay') {
            if (seg.length === 2) {
                numbers.push(seg);
            } else if (seg.length === 3) {
                if (seg.charAt(0) === seg.charAt(2)) {
                    numbers.push(seg.substring(0, 2));
                    numbers.push(seg.substring(1, 3));
                }
            }
        } else if (betType === 'bacang' || betType === 'bacang_lo') {
            if (seg.length === 3) {
                numbers.push(seg);
            }
        }
    });
    return numbers;
}

function stripAccents(str) {
    return str.normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/đ/g, "d")
              .replace(/Đ/g, "D");
}

function normalizeBetLine(line) {
    let normalized = stripAccents(line.trim());
    normalized = normalized.replace(/([dđ])`/gi, '$1');
    normalized = normalized.replace(/[’‘ʼ＇]/g, "'");
    
    // Temporarily shield actual decimal values (e.g. 1.5, 2.5k, 0,5) from replacement
    normalized = normalized.replace(/(\d+)[.,](\d)(?=[kKndDđĐ\s]|$)/g, '$1__DECIMAL_DOT__$2');
    
    // Convert all other dots and commas (separators) to spaces
    normalized = normalized.replace(/[.,]/g, ' ');
    
    // Restore decimal values
    normalized = normalized.replace(/__DECIMAL_DOT__/g, '.');
    
    // Convert old dot, underscore, or space formats for dau/dit/duoi (e.g. dau.1, dit_1, dau 1)
    normalized = normalized.replace(/\b(?:dau|dit|duoi)[._\s]+(\d)(?![0-9])/gi, (match, digit) => {
        const prefix = match.toLowerCase().startsWith('dau') ? 'dau' : 'dit';
        return prefix + digit;
    });
    
    normalized = normalized.replace(/\b(?:dau\s+dit|dau\s+duoi)\s*(\d)(?![0-9])/gi, 'dau$1, dit$1');
    normalized = normalized.replace(/\b(?:dd)\s*(\d)(?![0-9])/gi, 'dau$1, dit$1');
    normalized = normalized.replace(/\b(?:kep lech)\b/gi, 'kl');
    normalized = normalized.replace(/\b(?:lip|kep)\b/gi, 'k');
    normalized = normalized.replace(/\b(?:dau)\s*(\d)(?![0-9])/gi, 'dau$1');
    normalized = normalized.replace(/\b(?:dit|duoi)\s*(\d)(?![0-9])/gi, 'dit$1');
    normalized = normalized.replace(/\b(?:cham)\s*(\d)(?![0-9])/gi, 'cham$1');
    normalized = normalized.replace(/\b(?:tong)\s*(\d)(?![0-9])/gi, 't$1');
    normalized = normalized.replace(/\b(?:d)\s*(\d)(?![0-9])/gi, 'd$1');
    normalized = normalized.replace(/\b(?:t)\s*(\d)(?![0-9])/gi, 't$1');
    normalized = normalized.replace(/\b(?:bo|he)\s*(\d{1,2})(?![0-9])/gi, 'bo$1');
    normalized = normalized.replace(/\b(?:moi con bang|moi con)\b/gi, 'mc');
    normalized = normalized.replace(/\s*[,.]\s*(?==|x|mc|moi\s+con|\+|\*)/gi, ' ');
    normalized = normalized.replace(/([a-z0-9])\s*(mỗi\s+con\s*=?|moi\s+con\s*=?|mc\s*=|mc|=\s*mc|=|\+|\*|x)\s*(\d+(?:\.\d+)?)(?:\s*(?:d|đ|₫|k|n)(?=[\s.,;\-\d]|$))?(?![a-z0-9])/gi, '$1x$3');
    normalized = normalized.replace(/\bmc\s*(\d+(?:\.\d+)?)(?:\s*(?:d|đ|₫|k|n)(?=[\s.,;\-\d]|$))?(?![a-z0-9])/gi, 'x$1');
    normalized = normalized.replace(/\s+(\d+(?:\.\d+)?)\s*(?:d|đ|₫|k|n)(?![a-z0-9])/gi, ' x$1');
    return normalized;
}

function parseLineBetsUsingLk(line, currentMode = 'de') {
    let originalLine = line.trim();
    if (!originalLine) return { bets: [], nextMode: currentMode };

    let trimmed = normalizeBetLine(originalLine);
    
    let lineType = '';
    const typeRegex = {
        de: /^(de|d)$/i,
        lo: /^(lo|l)$/i,
        xienquay: /^(xienquay|xq|xienq|quay|q|xquay)$/i,
        xien: /^(lo\s+xien|xien|x|x2|x3|x4)$/i,
        bacang: /^(3cang|3c|c|bc|cang|3\s+cang)$/i,
        bacang_lo: /^(3clo|3cl)$/i
    };
    
    const spaceMatch = trimmed.match(/^(xienquay|xq|xienq|quay|q|xquay|lo\s+xien|de|lo|xien|x|x2|x3|x4|3cang|3c|3clo|3cl|d|l|c|bc|cang|3\s+cang)(?:\s+(.*))?$/i);
    if (spaceMatch) {
        const rawType = spaceMatch[1].toLowerCase();
        if (typeRegex.de.test(rawType)) lineType = 'de';
        else if (typeRegex.lo.test(rawType)) lineType = 'lo';
        else if (typeRegex.xienquay.test(rawType)) lineType = 'xienquay';
        else if (typeRegex.xien.test(rawType)) lineType = 'xien';
        else if (typeRegex.bacang.test(rawType)) lineType = 'bacang';
        else if (typeRegex.bacang_lo.test(rawType)) lineType = 'bacang_lo';

        if (lineType) {
            currentMode = lineType;
            trimmed = spaceMatch[2] ? spaceMatch[2].trim() : '';
            if (trimmed === '') {
                return { bets: [], nextMode: currentMode };
            }
        }
    }

    if (!lineType) lineType = currentMode;

    let bets = [];
    const groupRegex = /([a-wy-z0-9'’‘＇`.,\-\s]+)([x+*])(\d+(?:\.\d+)?)/gi;
    let groupMatch;
    while ((groupMatch = groupRegex.exec(trimmed)) !== null) {
        const rawNumString = groupMatch[1].trim();
        const amount = parseFloat(groupMatch[3]);
        if (amount <= 0 || isNaN(amount)) continue;

        const numString = resolveShorthands(rawNumString);
        const numbers = parseNumbersFromBetString(numString, lineType);
        
        let isValidGroup = (numbers.length > 0);
        if (isValidGroup) {
            let parsedNumbersCount = 0;
            const segments = numString.split(/[.,\-\s]+/).filter(s => s.length > 0);
            segments.forEach(seg => {
                if (!/^\d+$/.test(seg)) {
                    const isShorthand = /^(kl|k|dau\d|dit\d|cham\d|t\d|bo\d{1,2})$/i.test(seg);
                    if (isShorthand) {
                        if (lineType !== 'de' && lineType !== 'lo') {
                            isValidGroup = false;
                        } else {
                            parsedNumbersCount += 2;
                        }
                    } else {
                        isValidGroup = false;
                    }
                    return;
                }
                if (lineType === 'de' || lineType === 'lo') {
                    if (seg.length === 2) {
                        parsedNumbersCount += 1;
                    } else if (seg.length === 3) {
                        if (seg.charAt(0) === seg.charAt(2)) {
                            parsedNumbersCount += 2;
                        } else {
                            isValidGroup = false;
                        }
                    } else {
                        isValidGroup = false;
                    }
                } else if (lineType === 'xien' || lineType === 'xienquay') {
                    if (seg.length === 2) {
                        parsedNumbersCount += 1;
                    } else if (seg.length === 3) {
                        if (seg.charAt(0) === seg.charAt(2)) {
                            parsedNumbersCount += 2;
                        } else {
                            isValidGroup = false;
                        }
                    } else {
                        isValidGroup = false;
                    }
                } else if (lineType === 'bacang' || lineType === 'bacang_lo') {
                    if (seg.length === 3) {
                        parsedNumbersCount += 1;
                    } else {
                        isValidGroup = false;
                    }
                }
            });

            if ((lineType === 'xien' || lineType === 'xienquay') && parsedNumbersCount < 2) {
                isValidGroup = false;
            }
        }

        if (!isValidGroup) {
            bets.push({ mode: 'invalid', number: groupMatch[0], amount: 0 });
            continue;
        }

        if (lineType === 'xien' || lineType === 'xienquay') {
            if (lineType === 'xienquay') {
                const getCombos = (arr, k) => {
                    const result = [];
                    const fork = (i, combo) => {
                        if (combo.length === k) {
                            result.push(combo);
                            return;
                        }
                        if (i === arr.length) return;
                        fork(i + 1, [...combo, arr[i]]);
                        fork(i + 1, combo);
                    };
                    fork(0, []);
                    return result;
                };

                for (let size = 2; size <= 4; size++) {
                    if (numbers.length >= size) {
                        const combos = getCombos(numbers, size);
                        combos.forEach(combo => {
                            bets.push({
                                mode: 'xien',
                                number: combo.join('-'),
                                amount: amount
                            });
                        });
                    }
                }
            } else {
                if (numbers.length >= 2 && numbers.length <= 4) {
                    bets.push({
                        mode: 'xien',
                        number: numbers.join('-'),
                        amount: amount
                    });
                }
            }
        } else {
            let modeCode = lineType;
            if (lineType === 'bacang') modeCode = 'bc';
            else if (lineType === 'bacang_lo') modeCode = 'bc_lo';
            
            numbers.forEach(num => {
                bets.push({
                    mode: modeCode,
                    number: num,
                    amount: amount
                });
            });
        }
    }
    
    return { bets, nextMode: lineType };
}

function normalizeMessage() {
    const inputText = beforeTextarea.value;
    if (!inputText.trim()) {
        alert('Vui lòng nhập tin nhắn trước khi phân tích!');
        return;
    }
    
    const lines = inputText.split('\n');
    let outputLines = [];
    let allParsedBets = [];
    
    let activeMode = 'de'; // default bet type mode
    
    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) {
            outputLines.push('');
            return;
        }
        
        // Print original line
        outputLines.push(trimmed);
        
        // Try parsing line using lk logic
        const res = parseLineBetsUsingLk(trimmed, activeMode);
        activeMode = res.nextMode;
        
        if (res.bets.length > 0) {
            res.bets.forEach(bet => {
                if (bet.mode === 'invalid') {
                    outputLines.push(`❌ Lỗi cú pháp: ${bet.number}`);
                } else {
                    outputLines.push(`${bet.mode} ${bet.number}-${bet.amount}`);
                    allParsedBets.push(bet);
                }
            });
        }
        outputLines.push(''); // Add spacer
    });
    
    // Set normalized output
    afterTextarea.value = outputLines.join('\n');
    updateLineNumbers(afterTextarea, afterLineNumbers);
    
    // Save to global variable for balancing use
    parsedBetsGlobal = allParsedBets;
    
    // Update Stats Tables instantly
    displayStats(allParsedBets);
}

// --- Display Statistics at the bottom ---
function displayStats(parsedBets) {
    let dStats = {};
    let lStats = {};
    let bcStats = {};
    
    parsedBets.forEach(bet => {
        if (bet.mode === 'de') {
            dStats[bet.number] = (dStats[bet.number] || 0) + bet.amount;
        } else if (bet.mode === 'lo') {
            lStats[bet.number] = (lStats[bet.number] || 0) + bet.amount;
        } else if (bet.mode === 'bc') {
            bcStats[bet.number] = (bcStats[bet.number] || 0) + bet.amount;
        }
    });
    
    const countD = Object.keys(dStats).length;
    const countL = Object.keys(lStats).length;
    const countBC = Object.keys(bcStats).length;
    
    document.getElementById('header-d').textContent = `Thống kê D (${countD} số)`;
    document.getElementById('header-l').textContent = `TK L (${countL} số)`;
    document.getElementById('header-bc').textContent = `TK BC (${countBC} số)`;
    
    renderStatColumn('stat-d-list', dStats);
    renderStatColumn('stat-l-list', lStats);
    renderStatColumn('stat-bc-list', bcStats);
}

function renderStatColumn(containerId, statsObj) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const sorted = Object.entries(statsObj).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([num, val]) => {
        const item = document.createElement('div');
        item.className = 'stats-item';
        const displayVal = Number(val.toFixed(3));
        item.innerHTML = `<span>${num}</span><span class="val">${displayVal}</span>`;
        container.appendChild(item);
    });
}

// --- Balancing and Transfers Logic ---
let balanceState = {
    step: 1,
    deTransfers: {},
    loTransfers: {}
};

function runBalancingStep(isPercent) {
    // Always normalize/parse the latest message content first!
    normalizeMessage();
    if (parsedBetsGlobal.length === 0) return;
    
    const unitDe = document.getElementById('unit-de').value || 'N';
    const unitLo = document.getElementById('unit-lo').value || 'D';
    
    let dTotals = {};
    let lTotals = {};
    
    parsedBetsGlobal.forEach(bet => {
        if (bet.mode === 'de') {
            dTotals[bet.number] = (dTotals[bet.number] || 0) + bet.amount;
        } else if (bet.mode === 'lo') {
            lTotals[bet.number] = (lTotals[bet.number] || 0) + bet.amount;
        }
    });
    
    let deTransfersThisStep = [];
    let loTransfersThisStep = [];
    
    if (isPercent) {
        const keepPercentInput = document.getElementById('limit-keep-percent').value;
        const keepPercent = parseFloat(keepPercentInput);
        if (isNaN(keepPercent) || keepPercent < 0 || keepPercent > 100) {
            alert('Vui lòng nhập tỷ lệ % giữ lại hợp lệ (0-100)!');
            return;
        }
        
        const transferPercent = 100 - keepPercent;
        
        // Calculate De transfers
        Object.entries(dTotals).forEach(([num, total]) => {
            const totalExcess = total * (transferPercent / 100);
            const prevTransfer = balanceState.deTransfers[num] || 0;
            let excess = totalExcess - prevTransfer;
            excess = Math.round(excess * 10) / 10;
            if (excess >= 0.1) {
                deTransfersThisStep.push({ num, excess });
                balanceState.deTransfers[num] = prevTransfer + excess;
            }
        });
        
        // Calculate Lo transfers
        Object.entries(lTotals).forEach(([num, total]) => {
            const totalExcess = total * (transferPercent / 100);
            const prevTransfer = balanceState.loTransfers[num] || 0;
            let excess = totalExcess - prevTransfer;
            excess = Math.round(excess * 10) / 10;
            if (excess >= 0.1) {
                loTransfersThisStep.push({ num, excess });
                balanceState.loTransfers[num] = prevTransfer + excess;
            }
        });
    } else {
        const limitDe = parseFloat(document.getElementById('limit-d-max').value) || 0;
        const limitLo = parseFloat(document.getElementById('limit-l-max').value) || 0;
        
        // Calculate De transfers
        Object.entries(dTotals).forEach(([num, total]) => {
            const prevTransfer = balanceState.deTransfers[num] || 0;
            let excess = total - prevTransfer - limitDe;
            excess = Math.round(excess * 10) / 10;
            if (excess >= 0.1) {
                deTransfersThisStep.push({ num, excess });
                balanceState.deTransfers[num] = prevTransfer + excess;
            }
        });
        
        // Calculate Lo transfers
        Object.entries(lTotals).forEach(([num, total]) => {
            const prevTransfer = balanceState.loTransfers[num] || 0;
            let excess = total - prevTransfer - limitLo;
            excess = Math.round(excess * 10) / 10;
            if (excess >= 0.1) {
                loTransfersThisStep.push({ num, excess });
                balanceState.loTransfers[num] = prevTransfer + excess;
            }
        });
    }
    
    // Sort and format output text
    deTransfersThisStep.sort((a, b) => b.excess - a.excess);
    const deOutputText = deTransfersThisStep.map(t => `${t.num}x${t.excess}${unitDe}`).join(' ');
    
    loTransfersThisStep.sort((a, b) => b.excess - a.excess);
    const loOutputText = loTransfersThisStep.map(t => `${t.num}x${t.excess}${unitLo}`).join(' ');
    
    document.getElementById('transfer-de-output').value = deOutputText ? `De ${deOutputText}` : 'Không có số nào vượt ngưỡng';
    document.getElementById('transfer-lo-output').value = loOutputText ? `Lo ${loOutputText}` : 'Không có số nào vượt ngưỡng';
    
    // Update step counter UI
    const currentStep = balanceState.step;
    balanceState.step++;
    document.getElementById('balance-counter-label').textContent = `Số Lần Đã Cân Chuyển = ${currentStep}`;
    
    // Update dynamic button texts
    const btnStep = document.getElementById('btn-balance-step');
    const btnPercent = document.getElementById('btn-balance-percent');
    if (btnStep) btnStep.textContent = `Cân Chuyển Lần ${currentStep + 1}`;
    if (btnPercent) btnPercent.textContent = `Cân Chuyển Theo % (Lần ${currentStep + 1})`;
}

function resetBalancing() {
    balanceState.step = 1;
    balanceState.deTransfers = {};
    balanceState.loTransfers = {};
    document.getElementById('transfer-de-output').value = '';
    document.getElementById('transfer-lo-output').value = '';
    document.getElementById('balance-counter-label').textContent = `Số Lần Đã Cân Chuyển = 0`;
    
    const btnStep = document.getElementById('btn-balance-step');
    const btnPercent = document.getElementById('btn-balance-percent');
    if (btnStep) btnStep.textContent = 'Cân Chuyển Lần Đầu';
    if (btnPercent) btnPercent.textContent = 'Cân Chuyển 1 Lần theo %';
}

function transferRightToLeft() {
    const afterVal = afterTextarea.value;
    if (afterVal) {
        beforeTextarea.value = afterVal;
        updateLineNumbers(beforeTextarea, beforeLineNumbers);
    }
}

// --- Settlement & Winner Calculations ---
function openSettlementModal() {
    if (parsedBetsGlobal.length === 0) {
        normalizeMessage();
    }
    document.getElementById('settlement-modal').classList.add('open');
    document.getElementById('modal-step-results').style.display = 'block';
    document.getElementById('modal-step-report').style.display = 'none';
}

function closeSettlementModal() {
    document.getElementById('settlement-modal').classList.remove('open');
}

function backToResultsInput() {
    document.getElementById('modal-step-results').style.display = 'block';
    document.getElementById('modal-step-report').style.display = 'none';
}

// --- Fetch live Minh Ngoc Lottery ---
async function fetchHtmlWithProxy(targetUrl) {
    try {
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}&cache=${(new Date()).getTime()}`);
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (json.contents) return json.contents;
    } catch (e) {
        console.warn("Proxy allorigins failed, trying corsproxy...");
    }
    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
    if (!res.ok) throw new Error("Cả 2 dịch vụ proxy đều không tải được dữ liệu.");
    return await res.text();
}

async function fetchLotteryResults() {
    const btn = document.getElementById('btn-fetch-results');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="lucide-refresh-cw" style="animation: spin 1s linear infinite;"></i> Đang tải kết quả...';
    btn.disabled = true;
    
    try {
        const url = 'https://www.minhngoc.net.vn/xo-so-mien-bac.html';
        const html = await fetchHtmlWithProxy(url);
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const box = doc.querySelector('.box_kqxs') || doc.querySelector('.bkqmienbac');
        if (!box) {
            throw new Error('Không tìm thấy bảng kết quả trên trang Minh Ngọc');
        }
        
        const divs = box.querySelectorAll('td[class^="giai"] div');
        const prizes = Array.from(divs).map(div => div.textContent.trim()).filter(Boolean);
        
        if (prizes.length === 0) {
            throw new Error('Không lấy được giải từ bảng kết quả');
        }
        
        const dbVal = prizes[0]; // e.g. "98185"
        const deVal = dbVal.slice(-2);
        const bcVal = dbVal.slice(-3);
        
        // Extract the last 2 digits of each prize
        const loNumbers = prizes.map(p => p.slice(-2));
        
        // Update input values on the form!
        document.getElementById('draw-de').value = deVal;
        document.getElementById('draw-3c').value = bcVal;
        document.getElementById('draw-lo').value = loNumbers.join(' ');
        
        alert('Tải kết quả xổ số Miền Bắc thành công từ minhngoc.net!');
    } catch (err) {
        console.error(err);
        alert('Lỗi khi tải kết quả: ' + err.message + '\nBạn có thể tự nhập kết quả bằng tay.');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        lucide.createIcons();
    }
}

function calculateSettlement() {
    const drawDe = document.getElementById('draw-de').value.trim().padStart(2, '0');
    const draw3c = document.getElementById('draw-3c').value.trim().padStart(3, '0');
    
    const drawLoRaw = document.getElementById('draw-lo').value;
    const drawLoNumbers = drawLoRaw.split(/[\s,]+/).map(x => x.trim()).filter(x => x.length > 0).map(x => x.padStart(2, '0'));
    
    // Config prices
    const rateDeThu = parseFloat(document.getElementById('param-d-thu').value) || 0.72;
    const rateLoThu = parseFloat(document.getElementById('param-l-thu').value) || 21.70;
    
    const prizeDeMultiplier = parseFloat(document.getElementById('param-d-tra').value) || 70;
    const prizeLoMultiplier = parseFloat(document.getElementById('param-l-tra').value) || 80;
    const prizeBcMultiplier = parseFloat(document.getElementById('param-bc-tra').value) || 400;
    
    // Calculations lists
    let deBetsList = [];
    let loBetsList = [];
    let bcBetsList = [];
    
    let totalDeBet = 0;
    let winningDeBet = 0;
    
    let totalLoBetPoints = 0;
    let winningLoBetPoints = 0;
    
    let totalBcBet = 0;
    let winningBcBet = 0;
    
    // Process all bets
    parsedBetsGlobal.forEach(bet => {
        let isWin = false;
        let nhay = 0;
        
        if (bet.mode === 'de') {
            totalDeBet += bet.amount;
            if (bet.number === drawDe) {
                isWin = true;
                nhay = 1;
                winningDeBet += bet.amount;
            }
            deBetsList.push({ ...bet, isWin, nhay });
        } else if (bet.mode === 'lo') {
            totalLoBetPoints += bet.amount;
            const count = drawLoNumbers.filter(num => num === bet.number).length;
            if (count > 0) {
                isWin = true;
                nhay = count;
                winningLoBetPoints += (bet.amount * count);
            }
            loBetsList.push({ ...bet, isWin, nhay });
        } else if (bet.mode === 'bc') {
            totalBcBet += bet.amount;
            if (bet.number === draw3c) {
                isWin = true;
                nhay = 1;
                winningBcBet += bet.amount;
            }
            bcBetsList.push({ ...bet, isWin, nhay });
        }
    });
    
    // Cost calculation
    const deCost = totalDeBet * rateDeThu;
    const loCost = totalLoBetPoints * rateLoThu;
    const totalCost = deCost + loCost;
    
    // Prize calculation
    const dePrize = winningDeBet * prizeDeMultiplier;
    const loPrize = winningLoBetPoints * prizeLoMultiplier;
    const bcPrize = winningBcBet * prizeBcMultiplier;
    const totalPrize = dePrize + loPrize + bcPrize;
    
    const netBalance = totalCost - totalPrize;
    
    // Update headers in display
    document.getElementById('lbl-res-de').textContent = drawDe;
    document.getElementById('lbl-res-3c').textContent = draw3c;
    document.getElementById('lbl-res-lo').textContent = drawLoNumbers.join(' ');
    
    // Render columns
    renderReportColumn('col-rep-de', deBetsList, 'de');
    renderReportColumn('col-rep-lo', loBetsList, 'lo');
    renderReportColumn('col-rep-3c', bcBetsList, 'bc');
    
    // Update Footers
    document.getElementById('col-rep-de-foot').textContent = `${totalDeBet}k / ${winningDeBet}k`;
    document.getElementById('col-rep-lo-foot').textContent = `${totalLoBetPoints}d / ${winningLoBetPoints}d`;
    document.getElementById('col-rep-3c-foot').textContent = `${totalBcBet}k / ${winningBcBet}k`;
    
    // Update financial panel labels
    document.getElementById('res-calc-de-bet').textContent = `${totalDeBet}k`;
    document.getElementById('res-calc-de-cost').textContent = deCost.toFixed(1);
    
    document.getElementById('res-calc-lo-bet').textContent = `${totalLoBetPoints}d`;
    document.getElementById('res-calc-lo-cost').textContent = loCost.toFixed(1);
    
    document.getElementById('res-calc-total-cost').textContent = Math.round(totalCost).toLocaleString('vi-VN');
    document.getElementById('res-calc-prize').textContent = Math.round(totalPrize).toLocaleString('vi-VN');
    
    // Net result showing
    const netVal = Math.round(netBalance);
    const clientNetVal = Math.abs(netVal);
    
    document.getElementById('res-calc-net').textContent = netVal.toLocaleString('vi-VN');
    document.getElementById('res-calc-client-net').textContent = clientNetVal.toLocaleString('vi-VN');
    
    // Switch modal panel
    document.getElementById('modal-step-results').style.display = 'none';
    document.getElementById('modal-step-report').style.display = 'block';
}

function renderReportColumn(containerId, bets, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    if (bets.length === 0) {
        container.innerHTML = '<div style="color:#a0aec0; text-align:center; padding-top:20px;">Không có</div>';
        return;
    }
    
    bets.forEach(bet => {
        const item = document.createElement('div');
        item.className = 'report-item' + (bet.isWin ? ' won' : '');
        
        let unit = type === 'lo' ? 'd' : 'k';
        let winText = '';
        if (bet.isWin) {
            if (type === 'lo') {
                winText = ` - Số nháy: ${bet.nhay}`;
            } else {
                winText = ` - Trúng`;
            }
        }
        
        item.innerHTML = `
            <span>${bet.number}-${bet.amount}${unit}</span>
            <span>${winText}</span>
        `;
        container.appendChild(item);
    });
}

// Utility: Escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Initialize lucide icons on load
lucide.createIcons();

// Seed Dictionary initially on script load
getDictionary();
