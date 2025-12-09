// ===== Photo Timestamp App =====

class PhotoTimestampApp {
    constructor() {
        // State
        this.stream = null;
        this.photos = [];
        this.currentPhotoIndex = null;
        this.facingMode = 'environment'; // 'user' or 'environment'

        // Settings
        this.settings = {
            timestampPosition: 'bottom-right',
            timestampFormat: 'full',
            timestampColor: '#FFFFFF',
            photoQuality: 'high'
        };

        // Load saved data
        this.loadSettings();
        this.loadPhotos();

        // DOM Elements
        this.initializeElements();

        // Event Listeners
        this.initializeEventListeners();

        // Start app
        this.initialize();
    }

    initializeElements() {
        // Camera elements
        this.video = document.getElementById('cameraFeed');
        this.canvas = document.getElementById('photoCanvas');
        this.ctx = this.canvas.getContext('2d');

        // UI elements
        this.liveTimestamp = document.getElementById('liveTimestamp');
        this.captureBtn = document.getElementById('captureBtn');
        this.switchCameraBtn = document.getElementById('switchCameraBtn');
        this.galleryBtn = document.getElementById('galleryBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.galleryStrip = document.getElementById('galleryStrip');
        this.lastPhotoThumb = document.getElementById('lastPhotoThumb');
        this.captureFlash = document.getElementById('captureFlash');

        // State overlays
        this.permissionPrompt = document.getElementById('permissionPrompt');
        this.errorState = document.getElementById('errorState');
        this.errorMessage = document.getElementById('errorMessage');
        this.requestPermissionBtn = document.getElementById('requestPermissionBtn');
        this.retryBtn = document.getElementById('retryBtn');

        // Photo modal
        this.photoModal = document.getElementById('photoModal');
        this.previewImage = document.getElementById('previewImage');
        this.closeModalBtn = document.getElementById('closeModalBtn');
        this.deletePhotoBtn = document.getElementById('deletePhotoBtn');
        this.downloadBtn = document.getElementById('downloadBtn');

        // Settings modal
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
        this.timestampPositionSelect = document.getElementById('timestampPosition');
        this.timestampFormatSelect = document.getElementById('timestampFormat');
        this.photoQualitySelect = document.getElementById('photoQuality');
        this.colorBtns = document.querySelectorAll('.color-btn');
        this.clearAllPhotosBtn = document.getElementById('clearAllPhotosBtn');
    }

    initializeEventListeners() {
        // Camera controls
        this.captureBtn.addEventListener('click', () => this.capturePhoto());
        this.switchCameraBtn.addEventListener('click', () => this.switchCamera());

        // Buttons
        this.requestPermissionBtn.addEventListener('click', () => this.startCamera());
        this.retryBtn.addEventListener('click', () => this.startCamera());
        this.galleryBtn.addEventListener('click', () => this.openGallery());
        this.settingsBtn.addEventListener('click', () => this.openSettings());

        // Photo modal
        this.closeModalBtn.addEventListener('click', () => this.closePhotoModal());
        this.photoModal.querySelector('.modal-backdrop').addEventListener('click', () => this.closePhotoModal());
        this.deletePhotoBtn.addEventListener('click', () => this.deleteCurrentPhoto());
        this.downloadBtn.addEventListener('click', () => this.downloadCurrentPhoto());

        // Settings modal
        this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
        this.settingsModal.querySelector('.modal-backdrop').addEventListener('click', () => this.closeSettings());

        // Settings controls
        this.timestampPositionSelect.addEventListener('change', (e) => {
            this.settings.timestampPosition = e.target.value;
            this.saveSettings();
        });

        this.timestampFormatSelect.addEventListener('change', (e) => {
            this.settings.timestampFormat = e.target.value;
            this.saveSettings();
        });

        this.photoQualitySelect.addEventListener('change', (e) => {
            this.settings.photoQuality = e.target.value;
            this.saveSettings();
        });

        this.colorBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.colorBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.settings.timestampColor = btn.dataset.color;
                this.saveSettings();
            });
        });

        this.clearAllPhotosBtn.addEventListener('click', () => this.clearAllPhotos());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.photoModal.classList.contains('hidden')) {
                return;
            }
            if (e.code === 'Space') {
                e.preventDefault();
                this.capturePhoto();
            }
            if (e.code === 'Escape') {
                this.closePhotoModal();
                this.closeSettings();
            }
        });
    }

    async initialize() {
        // Start the live timestamp
        this.updateLiveTimestamp();
        setInterval(() => this.updateLiveTimestamp(), 1000);

        // Apply saved settings to UI
        this.applySettingsToUI();

        // Try to start camera
        await this.startCamera();

        // Render gallery
        this.renderGallery();
    }

    updateLiveTimestamp() {
        this.liveTimestamp.textContent = this.formatTimestamp(new Date());
    }

    formatTimestamp(date) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const month = months[date.getMonth()];
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();

        let hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;

        switch (this.settings.timestampFormat) {
            case 'full':
                return `${month} ${day}, ${year} • ${hours}:${minutes} ${ampm}`;
            case 'short':
                return `${date.getMonth() + 1}/${day}/${String(year).slice(-2)} ${hours}:${minutes}`;
            case 'date-only':
                return `${month} ${day}, ${year}`;
            case 'time-only':
                return `${hours}:${minutes}:${seconds} ${ampm}`;
            default:
                return `${month} ${day}, ${year} • ${hours}:${minutes} ${ampm}`;
        }
    }

    async startCamera() {
        this.hideStates();

        try {
            // Check if camera is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not supported in this browser');
            }

            // Stop any existing stream
            this.stopCamera();

            // Get camera constraints
            const constraints = {
                video: {
                    facingMode: this.facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false
            };

            // Request camera access
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;

            // Wait for video to be ready
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });

        } catch (error) {
            console.error('Camera error:', error);

            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                this.showPermissionPrompt();
            } else {
                this.showError(error.message || 'Unable to access camera');
            }
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }

    async switchCamera() {
        this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
        await this.startCamera();
    }

    capturePhoto() {
        if (!this.stream) return;

        // Flash effect
        this.captureFlash.classList.add('flash');
        setTimeout(() => this.captureFlash.classList.remove('flash'), 300);

        // Haptic feedback (if available)
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }

        // Get video dimensions
        const videoWidth = this.video.videoWidth;
        const videoHeight = this.video.videoHeight;

        // Set canvas dimensions based on quality setting
        let targetWidth = videoWidth;
        let targetHeight = videoHeight;

        if (this.settings.photoQuality === 'medium') {
            const scale = Math.min(1920 / videoWidth, 1080 / videoHeight, 1);
            targetWidth = Math.round(videoWidth * scale);
            targetHeight = Math.round(videoHeight * scale);
        } else if (this.settings.photoQuality === 'low') {
            const scale = Math.min(1280 / videoWidth, 720 / videoHeight, 1);
            targetWidth = Math.round(videoWidth * scale);
            targetHeight = Math.round(videoHeight * scale);
        }

        this.canvas.width = targetWidth;
        this.canvas.height = targetHeight;

        // Draw video frame to canvas (flip if using front camera)
        if (this.facingMode === 'user') {
            this.ctx.translate(targetWidth, 0);
            this.ctx.scale(-1, 1);
        }
        this.ctx.drawImage(this.video, 0, 0, targetWidth, targetHeight);

        // Reset transform
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Add timestamp overlay
        const timestamp = this.formatTimestamp(new Date());
        this.drawTimestamp(timestamp, targetWidth, targetHeight);

        // Convert to data URL
        const dataUrl = this.canvas.toDataURL('image/jpeg', 0.92);

        // Get current location from Google Drive service
        const location = (typeof googleDriveService !== 'undefined' && googleDriveService.currentLocation)
            ? googleDriveService.currentLocation
            : null;

        const property = (typeof googleDriveService !== 'undefined' && googleDriveService.currentProperty)
            ? googleDriveService.currentProperty.name
            : null;

        // Save photo
        const photo = {
            id: Date.now(),
            dataUrl: dataUrl,
            timestamp: new Date().toISOString(),
            location: location,
            property: property
        };

        this.photos.unshift(photo);
        this.savePhotos();
        this.renderGallery();

        // Upload to Google Drive if signed in
        if (typeof googleDriveService !== 'undefined' && googleDriveService.isSignedIn) {
            googleDriveService.uploadPhoto(dataUrl, property);
        }
    }

    drawTimestamp(text, width, height) {
        const padding = Math.max(20, width * 0.02);
        const fontSize = Math.max(16, Math.round(width * 0.025));

        // Set font
        this.ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif`;

        // Measure text
        const metrics = this.ctx.measureText(text);
        const textHeight = fontSize * 1.2;

        // Calculate position
        let x, y;
        const boxPadding = fontSize * 0.4;
        const boxWidth = metrics.width + boxPadding * 2;
        const boxHeight = textHeight + boxPadding;

        switch (this.settings.timestampPosition) {
            case 'top-left':
                x = padding;
                y = padding;
                break;
            case 'top-right':
                x = width - padding - boxWidth;
                y = padding;
                break;
            case 'bottom-left':
                x = padding;
                y = height - padding - boxHeight;
                break;
            case 'bottom-right':
            default:
                x = width - padding - boxWidth;
                y = height - padding - boxHeight;
                break;
        }

        // Draw semi-transparent background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, boxWidth, boxHeight, fontSize * 0.2);
        this.ctx.fill();

        // Draw text
        this.ctx.fillStyle = this.settings.timestampColor;
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, x + boxPadding, y + boxHeight / 2);

        // Add subtle shadow
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;
    }

    renderGallery() {
        if (this.photos.length === 0) {
            this.galleryStrip.innerHTML = `
                <div class="gallery-placeholder">
                    <span>Your photos will appear here</span>
                </div>
            `;
            this.lastPhotoThumb.style.backgroundImage = '';
            return;
        }

        // Update last photo thumbnail
        this.lastPhotoThumb.style.backgroundImage = `url(${this.photos[0].dataUrl})`;

        // Render gallery strip
        this.galleryStrip.innerHTML = this.photos.map((photo, index) => `
            <div class="gallery-thumb" data-index="${index}">
                <img src="${photo.dataUrl}" alt="Photo ${index + 1}" loading="lazy">
            </div>
        `).join('');

        // Add click handlers
        this.galleryStrip.querySelectorAll('.gallery-thumb').forEach(thumb => {
            thumb.addEventListener('click', () => {
                const index = parseInt(thumb.dataset.index);
                this.openPhotoModal(index);
            });
        });
    }

    openGallery() {
        if (this.photos.length > 0) {
            this.openPhotoModal(0);
        }
    }

    openPhotoModal(index) {
        this.currentPhotoIndex = index;
        const photo = this.photos[index];
        this.previewImage.src = photo.dataUrl;
        this.photoModal.classList.remove('hidden');
    }

    closePhotoModal() {
        this.photoModal.classList.add('hidden');
        this.currentPhotoIndex = null;
    }

    deleteCurrentPhoto() {
        if (this.currentPhotoIndex === null) return;

        if (confirm('Delete this photo?')) {
            this.photos.splice(this.currentPhotoIndex, 1);
            this.savePhotos();
            this.renderGallery();
            this.closePhotoModal();
            this.photoModal.classList.add('hidden');
            this.currentPhotoIndex = null;
        }
    }

    downloadCurrentPhoto() {
        if (this.currentPhotoIndex === null) return;

        const photo = this.photos[this.currentPhotoIndex];

        // Detect iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

        if (isIOS) {
            // For iOS: Open image in new window where user can long-press to save
            const newWindow = window.open('', '_blank');
            if (newWindow) {
                newWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body {
                                margin: 0;
                                padding: 20px;
                                background: #000;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                min-height: 100vh;
                                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                            }
                            .instructions {
                                color: #fff;
                                text-align: center;
                                padding: 20px;
                                background: rgba(255,255,255,0.1);
                                border-radius: 12px;
                                margin-bottom: 20px;
                                max-width: 90%;
                            }
                            .instructions h2 {
                                margin: 0 0 10px 0;
                                font-size: 18px;
                            }
                            .instructions p {
                                margin: 5px 0;
                                font-size: 14px;
                                opacity: 0.9;
                            }
                            img {
                                max-width: 90%;
                                height: auto;
                                border-radius: 8px;
                                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                            }
                        </style>
                    </head>
                    <body>
                        <div class="instructions">
                            <h2>📸 Save to Photos</h2>
                            <p><strong>Long press</strong> the image below</p>
                            <p>Tap <strong>"Save image in..."</strong></p>
                            <p>Then tap <strong>"Save in Photos"</strong></p>
                        </div>
                        <img src="${photo.dataUrl}" alt="Timestamped Photo">
                    </body>
                    </html>
                `);
                newWindow.document.close();
            }
        } else {
            // For desktop/Android: Standard download
            const link = document.createElement('a');
            link.href = photo.dataUrl;
            link.download = `timestamp_photo_${new Date(photo.timestamp).toISOString().replace(/[:.]/g, '-')}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    openSettings() {
        this.settingsModal.classList.remove('hidden');
    }

    closeSettings() {
        this.settingsModal.classList.add('hidden');
    }

    applySettingsToUI() {
        this.timestampPositionSelect.value = this.settings.timestampPosition;
        this.timestampFormatSelect.value = this.settings.timestampFormat;
        this.photoQualitySelect.value = this.settings.photoQuality;

        this.colorBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.color === this.settings.timestampColor);
        });
    }

    clearAllPhotos() {
        if (confirm('Delete all photos? This cannot be undone.')) {
            this.photos = [];
            this.savePhotos();
            this.renderGallery();
            this.closeSettings();
        }
    }

    hideStates() {
        this.permissionPrompt.classList.add('hidden');
        this.errorState.classList.add('hidden');
    }

    showPermissionPrompt() {
        this.permissionPrompt.classList.remove('hidden');
        this.errorState.classList.add('hidden');
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorState.classList.remove('hidden');
        this.permissionPrompt.classList.add('hidden');
    }

    saveSettings() {
        localStorage.setItem('timestampSettings', JSON.stringify(this.settings));
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('timestampSettings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.error('Error loading settings:', e);
        }
    }

    savePhotos() {
        try {
            // Limit to 50 photos to avoid storage issues
            const photosToSave = this.photos.slice(0, 50);
            localStorage.setItem('timestampPhotos', JSON.stringify(photosToSave));
        } catch (e) {
            console.error('Error saving photos:', e);
            // If storage is full, try removing oldest photos
            if (e.name === 'QuotaExceededError') {
                this.photos = this.photos.slice(0, 20);
                try {
                    localStorage.setItem('timestampPhotos', JSON.stringify(this.photos));
                } catch (e2) {
                    console.error('Still cannot save:', e2);
                }
            }
        }
    }

    loadPhotos() {
        try {
            const saved = localStorage.getItem('timestampPhotos');
            if (saved) {
                this.photos = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Error loading photos:', e);
            this.photos = [];
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PhotoTimestampApp();
});

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            // Service worker registration would go here
            // await navigator.serviceWorker.register('/sw.js');
            console.log('PWA ready');
        } catch (error) {
            console.log('Service worker registration skipped');
        }
    });
}
