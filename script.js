import { translations, setLanguage, updateURL, currentLang } from './i18n.js';
import JSZip from 'https://jspm.dev/jszip';
import FileSaver from 'https://jspm.dev/file-saver';

const imageInput = document.getElementById('imageInput');
const watermarkText = document.getElementById('watermarkText');
const watermarkDensity = document.getElementById('watermarkDensity');
const watermarkColor = document.getElementById('watermarkColor');
const watermarkSize = document.getElementById('watermarkSize');
const processButton = document.getElementById('processButton');
const previewContainer = document.getElementById('previewContainer');
const colorPreview = document.getElementById('colorPreview');
const colorPicker = document.getElementById('colorPicker');
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const languageSelector = document.getElementById('languageSelector');
const processingLoader = document.getElementById('processingLoader');
const imagePreviewArea = document.getElementById('imagePreviewArea');
const resetButton = document.getElementById('resetButton');
let uploadedFiles = []; // 用于存储已上传的文件
const downloadAllButton = document.getElementById('downloadAllButton');
const resultSection = document.getElementById('resultSection');
const watermarkPosition = document.getElementById('watermarkPosition');

function initializeColorInput() {
    const initialColor = '#dedede';
    watermarkColor.value = initialColor;
    colorPicker.value = initialColor;
    colorPreview.style.backgroundColor = initialColor;
}

// 将所有初始化和事件监听器的设置放个函数中
function initialize() {
    initializeColorInput();
    initializeFileInput();
    processButton.addEventListener('click', processImages);
    watermarkColor.addEventListener('input', updateColorPreview);
    colorPreview.addEventListener('click', () => colorPicker.click());
    colorPicker.addEventListener('input', () => {
        watermarkColor.value = colorPicker.value;
        updateColorPreview();
    });
    imageModal.addEventListener('click', function() {
        console.log('Modal clicked');
        this.classList.add('hidden');
    });

    console.log('imageModal element:', imageModal);
    console.log('modalImage element:', modalImage);

    languageSelector.addEventListener('change', (e) => {
        const lang = e.target.value;
        setLanguage(lang);
        updateURL(lang);
    });

    const urlParams = new URLSearchParams(window.location.search);
    const lang = urlParams.get('lang') || (window.location.pathname.includes('/en') ? 'en' : 'zh-CN');
    setLanguage(lang);
    languageSelector.value = lang;

    // 修改这部分代码
    const pasteArea = document.getElementById('pasteArea');
    const imageInput = document.getElementById('imageInput');
    pasteArea.addEventListener('click', () => imageInput.click());
    pasteArea.addEventListener('paste', handlePaste);
    document.addEventListener('paste', handlePaste);
    imageInput.addEventListener('change', handleFileSelect);

    resetButton.addEventListener('click', resetAll);
    downloadAllButton.addEventListener('click', downloadAllImages);

    updateImagePreview();
    handleMobileInteraction();
    window.addEventListener('resize', handleMobileInteraction);

    const watermarkPosition = document.getElementById('watermarkPosition');
    watermarkPosition.addEventListener('change', toggleWatermarkDensity);
    
    // 初始调用一次，以设置初始状态
    toggleWatermarkDensity();
    updateWatermarkDensityOptions(false);
}

// 确保在 DOM 完全加载后执行初始化
document.addEventListener('DOMContentLoaded', initialize);

function processImages() {
    console.log('Processing images...');
    if (uploadedFiles.length === 0) {
        alert(translations[currentLang].noImagesSelected);
        return;
    }

    const maxFiles = Math.min(uploadedFiles.length, 20);
    previewContainer.innerHTML = ''; // 清空之前的预览

    for (let i = 0; i < maxFiles; i++) {
        processImage(uploadedFiles[i]);
    }

    // 处理完成后显示结果部分
    resultSection.classList.remove('hidden');
}
function processImage(file) {
    console.log('Processing image:', file.name);
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            // 绘制原图
            ctx.drawImage(img, 0, 0);

            // 添加水印
            const text = watermarkText.value;
            const position = watermarkPosition.value;
            const density = position === 'tile' ? parseInt(watermarkDensity.value) : 1;
            const color = watermarkColor.value;
            const size = parseInt(watermarkSize.value);
            const opacity = parseInt(document.getElementById('watermarkOpacity').value) / 100;

            if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
                alert(translations[currentLang].invalidColorValue);
                return;
            }

            ctx.fillStyle = `rgba(${parseInt(color.slice(1,3),16)}, ${parseInt(color.slice(3,5),16)}, ${parseInt(color.slice(5,7),16)}, ${opacity})`;
            ctx.font = `${size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            if (position === 'tile') {
                // 整体平铺逻辑（保持原有的平铺逻辑）
                const angle = -Math.PI / 4;
                const cellWidth = canvas.width / density;
                const cellHeight = canvas.height / density;

                for (let i = 0; i < density; i++) {
                    for (let j = 0; j < density; j++) {
                        const x = (i + 0.5) * cellWidth;
                        const y = (j + 0.5) * cellHeight;

                        ctx.save();
                        ctx.translate(x, y);
                        ctx.rotate(angle);
                        ctx.fillText(text, 0, 0);
                        ctx.restore();
                    }
                }
            } else if (position === 'center') {
                // 居中水印
                const x = canvas.width / 2;
                const y = canvas.height / 2;
                ctx.fillText(text, x, y);
            } else {
                // 角落水印逻辑
                const padding = 15;
                let x, y;

                switch (position) {
                    case 'bottomRight':
                        x = canvas.width - padding;
                        y = canvas.height - padding;
                        ctx.textAlign = 'right';
                        ctx.textBaseline = 'bottom';
                        break;
                    case 'bottomLeft':
                        x = padding;
                        y = canvas.height - padding;
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'bottom';
                        break;
                    case 'topRight':
                        x = canvas.width - padding;
                        y = padding;
                        ctx.textAlign = 'right';
                        ctx.textBaseline = 'top';
                        break;
                    case 'topLeft':
                        x = padding;
                        y = padding;
                        ctx.textAlign = 'left';
                        ctx.textBaseline = 'top';
                        break;
                }

                ctx.fillText(text, x, y);
            }

            // 创建预览项
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';

            const previewImg = document.createElement('img');
            previewImg.src = canvas.toDataURL();
            previewImg.className = 'preview-image';
            previewImg.addEventListener('click', function() {
                modalImage.src = this.src;
                imageModal.classList.remove('hidden');
            });
            previewItem.appendChild(previewImg);

            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'button-group';

            const downloadLink = document.createElement('a');
            downloadLink.href = canvas.toDataURL('image/png');
            downloadLink.download = `watermarked_${file.name}`;
            downloadLink.textContent = translations[currentLang].downloadImage;
            downloadLink.className = 'download-button';
            buttonGroup.appendChild(downloadLink);

            const copyButton = document.createElement('button');
            copyButton.textContent = translations[currentLang].copyToClipboard;
            copyButton.className = 'copy-button';
            copyButton.addEventListener('click', () => copyImageToClipboard(canvas));
            buttonGroup.appendChild(copyButton);

            previewItem.appendChild(buttonGroup);
            previewContainer.appendChild(previewItem);
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

// 添加这个函数
function updateColorPreview() {
    const color = watermarkColor.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
        colorPreview.style.backgroundColor = color;
        colorPicker.value = color;
        watermarkColor.style.borderColor = '#e2e8f0'; // 重置边框颜色
    } else {
        colorPreview.style.backgroundColor = '#ffffff';
        watermarkColor.style.borderColor = '#f56565'; // 设置红色边框表示无效输入
    }
}

// 在文件底部添加这些事件监听器
watermarkColor.addEventListener('input', updateColorPreview);
colorPreview.addEventListener('click', () => colorPicker.click());
colorPicker.addEventListener('input', () => {
    watermarkColor.value = colorPicker.value;
    updateColorPreview();
});

// 确保这段代码在文件末尾
imageModal.addEventListener('click', function() {
    console.log('Modal clicked'); // 添加调试日志
    this.classList.add('hidden');
});

// 添加这行代码来检查元素是否正确获取
console.log('imageModal element:', imageModal);
console.log('modalImage element:', modalImage);

function initializeFileInput() {
    const fileInput = document.getElementById('imageInput');
    const pasteArea = document.getElementById('pasteArea');
    
    // 移除动态创建文本显示的代码，因为已经在HTML中静态定义了
    fileInput.addEventListener('change', handleFileSelect);
}

processButton.addEventListener('click', async () => {
    // 显示处理中的 loader
    processingLoader.style.display = 'block';
    processButton.disabled = true;

    try {
        // 这里是您处理图片的代码
        // await processImages();
    } catch (error) {
        console.error('处理图片时出错:', error);
    } finally {
        // 隐藏处理中的 loader
        processingLoader.style.display = 'none';
        processButton.disabled = false;
    }
});

// 修改 handleFileSelect 函数
function handleFileSelect(e) {
    const files = e.target.files;
    uploadedFiles = uploadedFiles.concat(Array.from(files)); // 使用 concat 来添加新文件
    updateFileNameDisplay();
    updateImagePreview();
}

// 修改 handlePaste 函数
function handlePaste(e) {
    e.preventDefault();
    e.stopPropagation();

    const items = e.clipboardData.items;
    const newFiles = [];

    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            newFiles.push(blob);
        }
    }

    uploadedFiles = uploadedFiles.concat(newFiles); // 使用 concat 来添加新文件
    updateFileNameDisplay();
    updateImagePreview();
}

// 修改 updateFileNameDisplay 函数
function updateFileNameDisplay() {
    const fileNameDisplay = document.querySelector('.file-status-container span[data-i18n="noFileChosen"]');
    
    if (uploadedFiles.length > 0) {
        const fileCount = uploadedFiles.length;
        const filesSelectedText = fileCount === 1 
            ? translations[currentLang].fileSelected 
            : translations[currentLang].filesSelected;
        fileNameDisplay.textContent = `${fileCount} ${filesSelectedText}`;
    } else {
        fileNameDisplay.textContent = translations[currentLang].noFileChosen;
    }
}

// 修改 updateImagePreview 函数
function updateImagePreview() {
    imagePreviewArea.innerHTML = ''; // 清空现有预览

    uploadedFiles.forEach((file, index) => {
        if (index < 20) { // 限制最多显示20个预览
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewWrapper = document.createElement('div');
                previewWrapper.className = 'relative group';
                
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'w-16 h-16 object-cover rounded';
                previewWrapper.appendChild(img);
                
                // 添加删除按钮
                const deleteButton = document.createElement('button');
                deleteButton.className = 'absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity';
                deleteButton.innerHTML = '×';
                deleteButton.onclick = (e) => {
                    e.stopPropagation(); // 防止触发上传区域的点击事件
                    uploadedFiles.splice(index, 1);
                    updateFileInput();
                    updateFileNameDisplay();
                    updateImagePreview();
                };
                previewWrapper.appendChild(deleteButton);
                
                imagePreviewArea.appendChild(previewWrapper);
            }
            reader.readAsDataURL(file);
        }
    });

    // 如果上传的文件超过20个，显示一个提示
    if (uploadedFiles.length > 20) {
        const message = document.createElement('p');
        message.textContent = `只显示前20张图片预览，共${uploadedFiles.length}张图片已上传`;
        message.className = 'text-sm text-gray-500 mt-2';
        imagePreviewArea.appendChild(message);
    }
}

// 添加重置函数
function resetAll() {
    uploadedFiles = [];
    updateFileInput();
    updateFileNameDisplay();
    updateImagePreview();
    document.getElementById('watermarkText').value = '';
    document.getElementById('watermarkPosition').value = 'tile'; // 重置水印位置
    document.getElementById('watermarkDensity').value = '3';
    document.getElementById('watermarkDensity').disabled = false;
    document.getElementById('watermarkColor').value = '#dedede';
    document.getElementById('watermarkSize').value = '20';
    updateColorPreview();
    previewContainer.innerHTML = '';
    // 重置时隐藏结果部分
    resultSection.classList.add('hidden');
    document.getElementById('watermarkPosition').value = 'tile';
    document.getElementById('watermarkDensity').disabled = false;
    updateWatermarkDensityOptions(false);
    toggleWatermarkDensity();
    document.getElementById('watermarkOpacity').value = '80';
}

// 添加新的函数来更新文件输入
function updateFileInput() {
    const dt = new DataTransfer();
    uploadedFiles.forEach(file => dt.items.add(file));
    document.getElementById('imageInput').files = dt.files;
}

// 添加新的函数来处理一键下载
async function downloadAllImages() {
    if (previewContainer.children.length === 0) {
        alert(translations[currentLang].noImagesToDownload);
        return;
    }

    const zip = new JSZip();
    const watermarkTextValue = watermarkText.value || 'watermark';
    const timestamp = getFormattedTimestamp();
    const zipFilename = `${watermarkTextValue}-${timestamp}.zip`;

    // 收集所有图片 URL
    const imageUrls = Array.from(previewContainer.querySelectorAll('img')).map(img => img.src);

    // 添加所有图片到 zip
    for (let i = 0; i < imageUrls.length; i++) {
        const imageBlob = await fetch(imageUrls[i]).then(r => r.blob());
        zip.file(`image-${i+1}.png`, imageBlob);
    }

    // 生成并下载 zip 文件
    zip.generateAsync({type:"blob"}).then(function(content) {
        FileSaver.saveAs(content, zipFilename);
    });
}

// 添加这个辅助函数来生成时间戳
function getFormattedTimestamp() {
    const now = new Date();
    return now.getFullYear() +
           String(now.getMonth() + 1).padStart(2, '0') +
           String(now.getDate()).padStart(2, '0') +
           String(now.getHours()).padStart(2, '0') +
           String(now.getMinutes()).padStart(2, '0');
}

function handleMobileInteraction() {
  const isMobile = window.innerWidth <= 640;
  const processButton = document.getElementById('processButton');
  const resetButton = document.getElementById('resetButton');

  if (isMobile) {
    processButton.textContent = translations[currentLang].processImagesShort;
    resetButton.textContent = translations[currentLang].resetButtonShort;
  } else {
    processButton.textContent = translations[currentLang].processImages;
    resetButton.textContent = translations[currentLang].resetButton;
  }
}

function toggleWatermarkDensity() {
    const watermarkPosition = document.getElementById('watermarkPosition');
    const watermarkDensity = document.getElementById('watermarkDensity');
    
    if (watermarkPosition.value === 'tile') {
        watermarkDensity.disabled = false;
        watermarkDensity.value = watermarkDensity.getAttribute('data-previous-value') || '3';
        updateWatermarkDensityOptions(false);
    } else {
        watermarkDensity.setAttribute('data-previous-value', watermarkDensity.value);
        watermarkDensity.value = '1';
        watermarkDensity.disabled = true;
        updateWatermarkDensityOptions(true);
    }
}

function updateWatermarkDensityOptions(singleWatermark) {
    const watermarkDensity = document.getElementById('watermarkDensity');
    const currentLang = document.documentElement.lang;
    
    if (singleWatermark) {
        watermarkDensity.innerHTML = `<option value="1">${translations[currentLang].singleWatermark}</option>`;
    } else {
        watermarkDensity.innerHTML = `
            <option value="2" data-i18n="twoByTwo">${translations[currentLang].twoByTwo}</option>
            <option value="3" selected data-i18n="threeByThree">${translations[currentLang].threeByThree}</option>
            <option value="4" data-i18n="fourByFour">${translations[currentLang].fourByFour}</option>
            <option value="5" data-i18n="fiveByFive">${translations[currentLang].fiveByFive}</option>
            <option value="6" data-i18n="sixBySix">${translations[currentLang].sixBySix}</option>
        `;
    }
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // 触发重绘
    toast.offsetHeight;

    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 2000);
}

async function copyImageToClipboard(canvas) {
    try {
        const blob = await new Promise(resolve => canvas.toBlob(resolve));
        await navigator.clipboard.write([
            new ClipboardItem({
                'image/png': blob
            })
        ]);
        showToast(translations[currentLang].imageCopied);
    } catch (err) {
        console.error('Failed to copy image: ', err);
        showToast(translations[currentLang].copyFailed);
    }
}

// 修改透明度输入验证
const watermarkOpacity = document.getElementById('watermarkOpacity');

// 在输入时只做基本的字符验证
watermarkOpacity.addEventListener('input', function(e) {
    // 移除非数字字符
    this.value = this.value.replace(/[^\d]/g, '');
});

// 在失去焦点时进行值的范围验证
watermarkOpacity.addEventListener('blur', function(e) {
    let value = parseInt(this.value);
    
    if (isNaN(value) || value === '') {
        value = 80; // 默认值
    } else if (value < 0) {
        value = 0;
    } else if (value > 100) {
        value = 100;
    }
    
    this.value = value;
});
