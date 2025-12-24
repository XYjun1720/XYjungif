/**
 * GIF精灵图分割生成器
 * 功能：多文件上传、网格分割、GIF生成、批量下载
 * 版本：v1.0
 */

// ==================== 全局变量 ====================
let images = new Map();          // 存储图片数据 {id, name, file, img, size}
let selectedIds = new Set();     // 选中的图片ID
let results = new Map();         // 生成的结果 {id, blob, url, name, width, height}
let settings = {                 // 生成设置
    cols: 4,
    rows: 4,
    fps: 10,
    quality: 10,
    loop: true,
    transparent: false
};
let gifLibLoaded = false;        // GIF.js是否已加载

// ==================== DOM元素引用 ====================
const DOM = {};

// ==================== 初始化函数 ====================
function initApp() {
    console.log('🎬 GIF生成器初始化...');
    
    // 绑定DOM元素
    bindDOMElements();
    
    // 绑定事件监听器
    bindEventListeners();
    
    // 初始化UI状态
    updateUIState();
    
    // 显示欢迎信息
    setTimeout(() => {
        showNotification('🎉 GIF生成器已就绪！点击"浏览文件"按钮上传图片', 'success');
    }, 1000);
    
    console.log('✅ 初始化完成');
}

// 绑定DOM元素
function bindDOMElements() {
    DOM.uploadArea = document.getElementById('uploadArea');
    DOM.uploadBtn = document.getElementById('uploadBtn');
    DOM.fileInput = document.getElementById('fileInput');
    
    DOM.imageList = document.getElementById('imageList');
    DOM.imageCount = document.getElementById('imageCount');
    
    DOM.selectAll = document.getElementById('selectAll');
    DOM.selectNone = document.getElementById('selectNone');
    DOM.clearAll = document.getElementById('clearAll');
    
    DOM.colsSlider = document.getElementById('cols');
    DOM.rowsSlider = document.getElementById('rows');
    DOM.fpsSlider = document.getElementById('fps');
    DOM.qualitySlider = document.getElementById('quality');
    DOM.colValue = document.getElementById('colValue');
    DOM.rowValue = document.getElementById('rowValue');
    DOM.fpsValue = document.getElementById('fpsValue');
    DOM.qualityValue = document.getElementById('qualityValue');
    
    DOM.loopCheckbox = document.getElementById('loopCheckbox');
    DOM.transparentCheckbox = document.getElementById('transparentCheckbox');
    
    DOM.generateSelected = document.getElementById('generateSelected');
    DOM.generateAll = document.getElementById('generateAll');
    DOM.batchDownload = document.getElementById('batchDownload');
    
    DOM.progressContainer = document.getElementById('progressContainer');
    DOM.progressFill = document.getElementById('progressFill');
    DOM.progressText = document.getElementById('progressText');
    DOM.progressPercent = document.getElementById('progressPercent');
    
    DOM.resultsSection = document.getElementById('resultsSection');
    DOM.resultsGrid = document.getElementById('resultsGrid');
    DOM.resultsCount = document.getElementById('resultsCount');
    
    DOM.previewCanvas = document.getElementById('previewCanvas');
    DOM.previewHint = document.getElementById('previewHint');
}

// 绑定事件监听器
function bindEventListeners() {
    // 上传按钮点击
    DOM.uploadBtn.addEventListener('click', () => {
        console.log('📁 点击了上传按钮');
        DOM.fileInput.click();
    });
    
    // 上传区域点击
    DOM.uploadArea.addEventListener('click', () => {
        DOM.fileInput.click();
    });
    
    // 文件选择变化
    DOM.fileInput.addEventListener('change', handleFileSelect);
    
    // 拖放功能
    setupDragAndDrop();
    
    // 选择控制按钮
    DOM.selectAll.addEventListener('click', () => selectAllImages(true));
    DOM.selectNone.addEventListener('click', () => selectAllImages(false));
    DOM.clearAll.addEventListener('click', clearAllImages);
    
    // 设置滑块
    bindSlider('cols', 'colValue', 'cols');
    bindSlider('rows', 'rowValue', 'rows');
    bindSlider('fps', 'fpsValue', 'fps');
    bindSlider('quality', 'qualityValue', 'quality');
    
    // 复选框
    DOM.loopCheckbox.addEventListener('change', (e) => {
        settings.loop = e.target.checked;
    });
    
    DOM.transparentCheckbox.addEventListener('change', (e) => {
        settings.transparent = e.target.checked;
    });
    
    // 生成按钮
    DOM.generateSelected.addEventListener('click', generateSelectedGIFs);
    DOM.generateAll.addEventListener('click', generateAllGIFs);
    
    // 批量下载按钮
    DOM.batchDownload.addEventListener('click', batchDownloadGIFs);
}

// ==================== 文件处理函数 ====================
function handleFileSelect(event) {
    const files = event.target.files;
    console.log(`📸 选择了 ${files.length} 个文件`);
    processFiles(files);
    event.target.value = ''; // 重置input
}

function setupDragAndDrop() {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        DOM.uploadArea.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        DOM.uploadArea.addEventListener(eventName, () => {
            DOM.uploadArea.classList.add('drag-over');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        DOM.uploadArea.addEventListener(eventName, () => {
            DOM.uploadArea.classList.remove('drag-over');
        }, false);
    });
    
    DOM.uploadArea.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        console.log(`📤 拖放了 ${files.length} 个文件`);
        processFiles(files);
    }, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

async function processFiles(fileList) {
    const files = Array.from(fileList).filter(file => 
        file.type.startsWith('image/') && 
        ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)
    );
    
    if (files.length === 0) {
        showNotification('请选择有效的图片文件（PNG、JPG、WebP）', 'warning');
        return;
    }
    
    showNotification(`正在加载 ${files.length} 张图片...`, 'info');
    
    for (const file of files) {
        try {
            await loadImage(file);
        } catch (error) {
            console.error(`加载图片失败 ${file.name}:`, error);
            showNotification(`"${file.name}" 加载失败`, 'error');
        }
    }
    
    updateImageList();
    showNotification(`成功加载 ${files.length} 张图片`, 'success');
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                const id = 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                
                images.set(id, {
                    id,
                    name: file.name,
                    file,
                    img,
                    size: formatFileSize(file.size)
                });
                
                selectedIds.add(id);
                resolve();
            };
            
            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = e.target.result;
        };
        
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsDataURL(file);
    });
}

// ==================== 图片列表管理 ====================
function updateImageList() {
    const count = images.size;
    DOM.imageCount.textContent = `(${count})`;
    
    if (count === 0) {
        DOM.imageList.innerHTML = `
            <div class="empty-message">
                <i class="fas fa-images"></i>
                <p>还没有上传任何图片</p>
            </div>
        `;
        updateUIState();
        return;
    }
    
    let html = '';
    images.forEach((imgData, id) => {
        const isSelected = selectedIds.has(id);
        html += `
            <div class="image-item ${isSelected ? 'selected' : ''}" data-id="${id}">
                <img src="${imgData.img.src}" class="image-preview" alt="${imgData.name}">
                <div class="image-info">
                    <div class="image-name">${imgData.name}</div>
                    <div class="image-size">${imgData.size}</div>
                </div>
                <div class="image-checkbox">
                    <input type="checkbox" ${isSelected ? 'checked' : ''}>
                </div>
            </div>
        `;
    });
    
    DOM.imageList.innerHTML = html;
    
    // 绑定图片项点击事件
    DOM.imageList.querySelectorAll('.image-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const id = item.dataset.id;
            const checkbox = item.querySelector('input[type="checkbox"]');
            
            // 如果点击的是复选框，让复选框自己处理
            if (e.target.tagName === 'INPUT') return;
            
            toggleImageSelection(id, checkbox);
            updateUIState();
        });
        
        // 复选框点击事件
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox) {
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = item.dataset.id;
                toggleImageSelection(id, checkbox);
                updateUIState();
            });
        }
    });
    
    updateUIState();
}

function toggleImageSelection(id, checkbox) {
    if (selectedIds.has(id)) {
        selectedIds.delete(id);
        if (checkbox) checkbox.checked = false;
    } else {
        selectedIds.add(id);
        if (checkbox) checkbox.checked = true;
        
        // 显示选中图片的预览
        const imgData = images.get(id);
        if (imgData) {
            drawGridPreview(imgData.img);
            DOM.previewHint.textContent = '网格预览';
        }
    }
}

function selectAllImages(select = true) {
    if (select) {
        selectedIds = new Set(images.keys());
    } else {
        selectedIds.clear();
    }
    updateImageList();
    showNotification(select ? '已全选所有图片' : '已取消全选', 'info');
}

function clearAllImages() {
    if (images.size === 0) return;
    
    if (confirm(`确定要清空所有 ${images.size} 张图片吗？`)) {
        images.clear();
        selectedIds.clear();
        results.clear();
        updateImageList();
        clearResults();
        DOM.previewHint.textContent = '选择图片后显示网格预览';
        showNotification('已清空所有图片', 'success');
    }
}

// ==================== 设置滑块绑定 ====================
function bindSlider(sliderId, valueId, settingKey) {
    const slider = DOM[sliderId + 'Slider'];
    const value = DOM[valueId];
    
    if (!slider || !value) return;
    
    // 初始化显示
    value.textContent = settings[settingKey];
    slider.value = settings[settingKey];
    
    // 监听变化
    slider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        settings[settingKey] = val;
        value.textContent = val;
        
        // 更新预览
        if (selectedIds.size > 0) {
            const firstId = Array.from(selectedIds)[0];
            const imgData = images.get(firstId);
            if (imgData) {
                drawGridPreview(imgData.img);
            }
        }
    });
}

// ==================== 网格预览 ====================
function drawGridPreview(image) {
    if (!DOM.previewCanvas || !image) return;
    
    const canvas = DOM.previewCanvas;
    const ctx = canvas.getContext('2d');
    const cols = settings.cols;
    const rows = settings.rows;
    
    // 设置画布尺寸
    const maxWidth = 400;
    const maxHeight = 300;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制图片
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    
    // 绘制网格线
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    
    // 垂直线
    for (let i = 1; i < cols; i++) {
        const x = (canvas.width / cols) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // 水平线
    for (let i = 1; i < rows; i++) {
        const y = (canvas.height / rows) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // 添加网格信息
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`${cols}×${rows} 网格`, 10, 25);
}

// ==================== GIF生成函数 ====================
async function generateSelectedGIFs() {
    if (selectedIds.size === 0) {
        showNotification('请先选择要生成的图片', 'warning');
        return;
    }
    
    await generateGIFs(Array.from(selectedIds));
}

async function generateAllGIFs() {
    if (images.size === 0) {
        showNotification('请先上传图片', 'warning');
        return;
    }
    
    await generateGIFs(Array.from(images.keys()));
}

async function generateGIFs(imageIds) {
    // 检查GIF.js是否加载
    if (!window.GIF) {
        showNotification('正在加载GIF.js库，请稍后重试...', 'warning');
        return;
    }
    
    // 显示进度条
    showProgress(true);
    DOM.resultsSection.style.display = 'block';
    
    const total = imageIds.length;
    let completed = 0;
    
    // 清空之前的结果
    results.clear();
    clearResults();
    
    for (const id of imageIds) {
        const imageData = images.get(id);
        if (!imageData) continue;
        
        try {
            // 更新进度
            updateProgress(completed, total, `处理中: ${imageData.name}`);
            
            // 生成GIF
            const gifData = await createGIF(imageData.img, imageData.name);
            
            // 保存结果
            results.set(id, {
                ...gifData,
                originalName: imageData.name
            });
            
            completed++;
            
            // 更新结果列表
            updateResultsList();
            
            // 更新进度
            updateProgress(completed, total, `完成: ${imageData.name}`);
            
        } catch (error) {
            console.error(`生成GIF失败 ${imageData.name}:`, error);
            showNotification(`"${imageData.name}" 生成失败: ${error.message}`, 'error');
        }
    }
    
    // 完成
    showProgress(false);
    
    if (results.size > 0) {
        showNotification(`✅ 成功生成 ${results.size} 个GIF文件`, 'success');
    } else {
        showNotification('未能成功生成任何GIF文件', 'warning');
    }
}

function createGIF(image, originalName) {
    return new Promise((resolve, reject) => {
        const cols = settings.cols;
        const rows = settings.rows;
        const frameWidth = Math.floor(image.width / cols);
        const frameHeight = Math.floor(image.height / rows);
        const delay = Math.floor(1000 / settings.fps);
        const repeat = settings.loop ? 0 : 1;
        
        // 创建GIF实例
        const gif = new GIF({
            workers: 2,
            quality: settings.quality,
            width: frameWidth,
            height: frameHeight,
            workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js',
            background: settings.transparent ? '#00000000' : '#ffffff',
            repeat: repeat
        });
        
        // 创建临时画布
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = frameWidth;
        tempCanvas.height = frameHeight;
        const ctx = tempCanvas.getContext('2d');
        
        // 提取每一帧
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // 清空画布
                if (settings.transparent) {
                    ctx.clearRect(0, 0, frameWidth, frameHeight);
                } else {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, frameWidth, frameHeight);
                }
                
                // 绘制当前帧
                ctx.drawImage(
                    image,
                    col * frameWidth,
                    row * frameHeight,
                    frameWidth,
                    frameHeight,
                    0, 0,
                    frameWidth,
                    frameHeight
                );
                
                // 添加到GIF
                gif.addFrame(ctx, { delay: delay });
            }
        }
        
        // GIF渲染完成
        gif.on('finished', (blob) => {
            const url = URL.createObjectURL(blob);
            const gifName = originalName.replace(/\.[^/.]+$/, '') + '.gif';
            
            resolve({
                blob,
                url,
                name: gifName,
                width: frameWidth,
                height: frameHeight,
                frames: cols * rows
            });
        });
        
        // 错误处理
        gif.on('error', (error) => {
            reject(new Error(`GIF编码失败: ${error}`));
        });
        
        // 开始渲染
        gif.render();
    });
}

// ==================== 结果管理 ====================
function updateResultsList() {
    const count = results.size;
    DOM.resultsCount.textContent = `(${count})`;
    
    if (count === 0) {
        DOM.resultsGrid.innerHTML = `
            <div class="empty-results">
                <i class="fas fa-film"></i>
                <p>生成的GIF将显示在这里</p>
            </div>
        `;
        updateBatchDownloadButton();
        return;
    }
    
    let html = '';
    results.forEach((gifData, id) => {
        html += `
            <div class="result-item" data-id="${id}">
                <img src="${gifData.url}" class="result-preview" alt="${gifData.name}">
                <div class="result-info">
                    <div class="result-name">${gifData.name}</div>
                    <div class="result-details">${gifData.width}×${gifData.height} | ${gifData.frames}帧</div>
                </div>
                <div class="result-actions">
                    <button class="result-btn download-btn" title="下载" onclick="downloadGIF('${id}')">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    DOM.resultsGrid.innerHTML = html;
    updateBatchDownloadButton();
}

function downloadGIF(imageId) {
    const gifData = results.get(imageId);
    if (!gifData) return;
    
    const link = document.createElement('a');
    link.href = gifData.url;
    link.download = gifData.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification(`已开始下载: ${gifData.name}`, 'success');
}

function batchDownloadGIFs() {
    if (results.size === 0) {
        showNotification('没有可下载的GIF文件', 'warning');
        return;
    }
    
    showNotification(`开始批量下载 ${results.size} 个文件...`, 'info');
    
    let index = 0;
    results.forEach((gifData, id) => {
        setTimeout(() => {
            downloadGIF(id);
        }, index * 300);
        index++;
    });
}

function clearResults() {
    DOM.resultsGrid.innerHTML = `
        <div class="empty-results">
            <i class="fas fa-film"></i>
            <p>生成的GIF将显示在这里</p>
        </div>
    `;
    DOM.resultsCount.textContent = '(0)';
    DOM.resultsSection.style.display = 'none';
    updateBatchDownloadButton();
}

// ==================== UI更新函数 ====================
function updateUIState() {
    const hasImages = images.size > 0;
    const hasSelected = selectedIds.size > 0;
    
    // 更新按钮状态
    DOM.generateSelected.disabled = !hasSelected;
    DOM.generateAll.disabled = !hasImages;
    DOM.clearAll.disabled = !hasImages;
}

function showProgress(show) {
    if (show) {
        DOM.progressContainer.style.display = 'block';
    } else {
        DOM.progressContainer.style.display = 'none';
        // 重置进度条
        DOM.progressFill.style.width = '0%';
        DOM.progressText.textContent = '准备生成...';
        DOM.progressPercent.textContent = '0%';
    }
}

function updateProgress(current, total, message) {
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    
    DOM.progressFill.style.width = `${percent}%`;
    DOM.progressText.textContent = message || `处理中... ${current}/${total}`;
    DOM.progressPercent.textContent = `${percent}%`;
}

function updateBatchDownloadButton() {
    const hasResults = results.size > 0;
    
    DOM.batchDownload.disabled = !hasResults;
    
    if (hasResults) {
        DOM.batchDownload.innerHTML = `<i class="fas fa-download"></i> 批量下载所有GIF (${results.size}个)`;
    } else {
        DOM.batchDownload.innerHTML = `<i class="fas fa-download"></i> 批量下载所有GIF`;
    }
}

// ==================== 工具函数 ====================
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 3000);
    
    // 点击快速关闭
    notification.addEventListener('click', () => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ==================== 页面加载完成 ====================
// 等待页面完全加载后初始化应用
document.addEventListener('DOMContentLoaded', initApp);

// 添加全局下载函数（供HTML中的onclick调用）
window.downloadGIF = downloadGIF;
