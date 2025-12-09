// ===== Google Drive Integration Service =====

class GoogleDriveService {
    constructor() {
        this.accessToken = null;
        this.isSignedIn = false;
        this.rootFolderId = null;
        this.spreadsheetId = null;
        this.tokenClient = null;
        this.userEmail = null;

        // UI Elements
        this.signInBtn = document.getElementById('googleSignInBtn');
        this.propertyIndicator = document.getElementById('propertyIndicator');
        this.propertyNameEl = document.getElementById('propertyName');
        this.syncStatus = document.getElementById('syncStatus');

        // Current location
        this.currentLocation = null;
        this.currentProperty = null;

        // Initialize
        this.init();
    }

    async init() {
        // Show sign-in button
        if (this.signInBtn) {
            this.signInBtn.classList.remove('hidden');
            this.signInBtn.addEventListener('click', () => this.handleSignIn());
        }

        // Initialize Google Identity Services
        this.initializeGoogleAuth();

        // Start watching location
        this.startLocationWatching();

        // Check for existing session
        this.checkExistingSession();
    }

    initializeGoogleAuth() {
        // Wait for Google Identity Services to load
        const checkGIS = setInterval(() => {
            if (typeof google !== 'undefined' && google.accounts) {
                clearInterval(checkGIS);

                this.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: GOOGLE_CONFIG.clientId,
                    scope: GOOGLE_CONFIG.scopes.join(' '),
                    callback: (response) => this.handleAuthResponse(response)
                });

                console.log('Google Auth initialized');
            }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => clearInterval(checkGIS), 10000);
    }

    checkExistingSession() {
        const savedToken = localStorage.getItem('googleAccessToken');
        const tokenExpiry = localStorage.getItem('googleTokenExpiry');

        if (savedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
            this.accessToken = savedToken;
            this.isSignedIn = true;
            this.updateSignInUI();
        }
    }

    handleSignIn() {
        if (this.isSignedIn) {
            this.signOut();
        } else {
            if (this.tokenClient) {
                this.tokenClient.requestAccessToken();
            } else {
                alert('Google Sign-In is still loading. Please try again in a moment.');
            }
        }
    }

    handleAuthResponse(response) {
        if (response.error) {
            console.error('Auth error:', response.error);
            this.showSyncStatus('Sign-in failed', 'error');
            return;
        }

        this.accessToken = response.access_token;
        this.isSignedIn = true;

        // Save token (expires in ~1 hour)
        localStorage.setItem('googleAccessToken', this.accessToken);
        localStorage.setItem('googleTokenExpiry', Date.now() + 3500000);

        // Get user email
        this.getUserEmail();

        this.updateSignInUI();
        this.showSyncStatus('Signed in!', 'success');

        // Set up Drive folders
        this.setupDriveFolders();
    }

    async getUserEmail() {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });
            const userInfo = await response.json();
            this.userEmail = userInfo.email || 'unknown';
            localStorage.setItem('googleUserEmail', this.userEmail);
            console.log('User email:', this.userEmail);
        } catch (error) {
            console.error('Error getting user email:', error);
            this.userEmail = 'unknown';
        }
    }

    signOut() {
        this.accessToken = null;
        this.isSignedIn = false;
        localStorage.removeItem('googleAccessToken');
        localStorage.removeItem('googleTokenExpiry');
        this.updateSignInUI();
    }

    updateSignInUI() {
        if (this.signInBtn) {
            if (this.isSignedIn) {
                this.signInBtn.classList.add('signed-in');
                this.signInBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                    <span>Synced</span>
                `;
            } else {
                this.signInBtn.classList.remove('signed-in');
                this.signInBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                    </svg>
                    <span>Sign In</span>
                `;
            }
        }
    }

    // ===== Location Services =====

    startLocationWatching() {
        if (!navigator.geolocation) {
            console.log('Geolocation not supported');
            return;
        }

        // Get initial location
        this.getCurrentLocation();

        // Watch for location changes
        navigator.geolocation.watchPosition(
            (position) => this.handleLocationUpdate(position),
            (error) => console.log('Location error:', error.message),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        );
    }

    getCurrentLocation() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.handleLocationUpdate(position);
                    resolve(position);
                },
                (error) => {
                    console.log('Location error:', error.message);
                    reject(error);
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    }

    handleLocationUpdate(position) {
        this.currentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
        };

        // Detect property
        const property = detectProperty(this.currentLocation.lat, this.currentLocation.lng);

        if (property) {
            this.currentProperty = property;
            this.showPropertyIndicator(property.name);
        } else {
            this.currentProperty = null;
            this.hidePropertyIndicator();
        }
    }

    showPropertyIndicator(name) {
        if (this.propertyIndicator && this.propertyNameEl) {
            this.propertyNameEl.textContent = name;
            this.propertyIndicator.classList.remove('hidden');
        }
    }

    hidePropertyIndicator() {
        if (this.propertyIndicator) {
            this.propertyIndicator.classList.add('hidden');
        }
    }

    // ===== Google Drive API =====

    async setupDriveFolders() {
        try {
            // Use the shared folder ID
            this.rootFolderId = GOOGLE_CONFIG.sharedFolderId;
            console.log('Using shared folder:', this.rootFolderId);

            // Use the hardcoded spreadsheet ID (no more searching!)
            this.spreadsheetId = GOOGLE_CONFIG.spreadsheetId;
            console.log('Using hardcoded spreadsheet:', this.spreadsheetId);

        } catch (error) {
            console.error('Error setting up Drive:', error);
        }
    }

    async findOrCreateFolder(name, parentId) {
        // List all files in parent folder to find existing folder
        try {
            const listResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files?q='${parentId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)`,
                {
                    headers: { 'Authorization': `Bearer ${this.accessToken}` }
                }
            );

            const listResult = await listResponse.json();
            console.log('Files in parent folder:', listResult);

            // Find folder with matching name
            if (listResult.files) {
                const existingFolder = listResult.files.find(
                    f => f.name === name && f.mimeType === 'application/vnd.google-apps.folder'
                );
                if (existingFolder) {
                    console.log('Found existing folder:', name, existingFolder.id);
                    return existingFolder.id;
                }
            }
        } catch (error) {
            console.error('Error searching for folder:', error);
        }

        // Create new folder
        const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentId]
            })
        });

        const folder = await createResponse.json();
        return folder.id;
    }

    async findOrCreateSpreadsheet() {
        // List all files in root folder to find existing spreadsheet
        try {
            const listResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files?q='${this.rootFolderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)`,
                {
                    headers: { 'Authorization': `Bearer ${this.accessToken}` }
                }
            );

            const listResult = await listResponse.json();
            console.log('Files in root folder:', listResult);

            // Find spreadsheet with matching name
            if (listResult.files) {
                const existingSpreadsheet = listResult.files.find(
                    f => f.name === GOOGLE_CONFIG.spreadsheetName && f.mimeType === 'application/vnd.google-apps.spreadsheet'
                );
                if (existingSpreadsheet) {
                    this.spreadsheetId = existingSpreadsheet.id;
                    console.log('Found existing spreadsheet:', this.spreadsheetId);
                    return;
                }
            }
        } catch (error) {
            console.error('Error searching for spreadsheet:', error);
        }

        // Create new spreadsheet
        const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                properties: { title: GOOGLE_CONFIG.spreadsheetName },
                sheets: [{
                    properties: { title: 'Photo Log' },
                    data: [{
                        rowData: [{
                            values: [
                                { userEnteredValue: { stringValue: 'Property Name' } },
                                { userEnteredValue: { stringValue: 'Date' } },
                                { userEnteredValue: { stringValue: 'Time' } },
                                { userEnteredValue: { stringValue: 'Filename' } },
                                { userEnteredValue: { stringValue: 'GPS Coordinates' } },
                                { userEnteredValue: { stringValue: 'Drive Link' } },
                                { userEnteredValue: { stringValue: 'Uploaded By' } }
                            ]
                        }]
                    }]
                }]
            })
        });

        const spreadsheet = await createResponse.json();
        this.spreadsheetId = spreadsheet.spreadsheetId;

        // Move spreadsheet to root folder
        await fetch(`https://www.googleapis.com/drive/v3/files/${this.spreadsheetId}?addParents=${this.rootFolderId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });
    }

    // ===== Upload Photo =====

    async uploadPhoto(dataUrl, propertyName = null) {
        console.log('Upload started, isSignedIn:', this.isSignedIn, 'hasToken:', !!this.accessToken);

        if (!this.isSignedIn || !this.accessToken) {
            console.log('Not signed in, skipping upload');
            this.showSyncStatus('Sign in to sync', 'error');
            return null;
        }

        // Check if token might be expired
        const tokenExpiry = localStorage.getItem('googleTokenExpiry');
        if (tokenExpiry && Date.now() > parseInt(tokenExpiry)) {
            console.log('Token expired, requesting new token');
            this.isSignedIn = false;
            this.accessToken = null;
            this.showSyncStatus('Session expired - Sign in again', 'error');
            this.updateSignInUI();
            return null;
        }

        const now = new Date();

        // Format date and time in Eastern Standard Time
        const estOptions = { timeZone: 'America/New_York' };
        const dateStr = now.toLocaleDateString('en-CA', estOptions); // 2025-12-08 format
        const timeStr = now.toLocaleTimeString('en-GB', { ...estOptions, hour12: false }).replace(/:/g, '-'); // 19-04-23
        const emailPrefix = this.userEmail ? this.userEmail.split('@')[0] : 'unknown';
        const property = this.currentProperty ? this.currentProperty.name : 'Unknown Location';
        const filename = `${property}_${dateStr}_${timeStr}_${emailPrefix}.jpg`;

        this.showSyncStatus('Uploading...', 'uploading');

        try {
            // Ensure folders exist
            if (!this.rootFolderId) {
                console.log('Setting up Drive folders...');
                await this.setupDriveFolders();
            }

            if (!this.rootFolderId) {
                throw new Error('Failed to create root folder');
            }

            // Get the property and its folder ID
            let propertyFolderId;
            let propertyDisplayName;

            if (this.currentProperty && this.currentProperty.folderId) {
                // Use the detected property's folder
                propertyFolderId = this.currentProperty.folderId;
                propertyDisplayName = this.currentProperty.name;
            } else {
                // Use Unknown Location folder
                propertyFolderId = GOOGLE_CONFIG.unknownLocationFolderId;
                propertyDisplayName = 'Unknown Location';
            }

            console.log('Using property folder:', propertyDisplayName, propertyFolderId);

            // Create or find date folder inside property folder
            const dateFolderId = await this.findOrCreateFolder(dateStr, propertyFolderId);

            console.log('Converting to blob...');
            // Convert data URL to blob
            const blob = await this.dataUrlToBlob(dataUrl);

            console.log('Uploading file...');
            // Upload file using multipart upload
            const metadata = {
                name: filename,
                parents: [dateFolderId],
                mimeType: 'image/jpeg'
            };

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', blob);

            const uploadResponse = await fetch(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
                {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${this.accessToken}` },
                    body: form
                }
            );

            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json();
                console.error('Upload response error:', errorData);

                // Handle auth errors
                if (uploadResponse.status === 401 || uploadResponse.status === 403) {
                    this.signOut();
                    this.showSyncStatus('Auth error - Sign in again', 'error');
                    return null;
                }

                throw new Error(errorData.error?.message || 'Upload failed');
            }

            const file = await uploadResponse.json();
            console.log('Upload successful:', file);

            // Log to spreadsheet
            try {
                await this.logToSpreadsheet(property, now, filename, file.webViewLink);
            } catch (sheetError) {
                console.error('Spreadsheet logging error:', sheetError);
                // Don't fail the whole upload if just the logging fails
            }

            this.showSyncStatus(`✓ Saved to ${property}`, 'success');

            return file;

        } catch (error) {
            console.error('Upload error:', error);
            this.showSyncStatus('Upload failed: ' + error.message, 'error');
            return null;
        }
    }

    async logToSpreadsheet(propertyName, date, filename, driveLink) {
        if (!this.spreadsheetId) return;

        // Format date and time in Eastern Standard Time for spreadsheet
        const estOptions = { timeZone: 'America/New_York' };
        const dateStr = date.toLocaleDateString('en-US', { ...estOptions, year: 'numeric', month: 'short', day: '2-digit' });
        const timeStr = date.toLocaleTimeString('en-US', { ...estOptions, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const gpsStr = this.currentLocation
            ? `${this.currentLocation.lat.toFixed(6)}, ${this.currentLocation.lng.toFixed(6)}`
            : 'N/A';
        const uploadedBy = this.userEmail || 'unknown';

        const values = [[propertyName, dateStr, timeStr, filename, gpsStr, driveLink || '', uploadedBy]];

        await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Photo Log!A:G:append?valueInputOption=USER_ENTERED`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ values })
            }
        );
    }

    dataUrlToBlob(dataUrl) {
        return new Promise((resolve) => {
            const arr = dataUrl.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            resolve(new Blob([u8arr], { type: mime }));
        });
    }

    showSyncStatus(message, type = 'uploading') {
        if (!this.syncStatus) return;

        const icon = this.syncStatus.querySelector('.sync-icon');
        const msg = this.syncStatus.querySelector('.sync-message');

        switch (type) {
            case 'success':
                icon.textContent = '✓';
                this.syncStatus.className = 'sync-status success';
                break;
            case 'error':
                icon.textContent = '✕';
                this.syncStatus.className = 'sync-status error';
                break;
            default:
                icon.textContent = '☁️';
                this.syncStatus.className = 'sync-status';
        }

        msg.textContent = message;
        this.syncStatus.classList.remove('hidden');

        // Hide after 3 seconds for success/error
        if (type !== 'uploading') {
            setTimeout(() => {
                this.syncStatus.classList.add('hidden');
            }, 3000);
        }
    }

    hideSyncStatus() {
        if (this.syncStatus) {
            this.syncStatus.classList.add('hidden');
        }
    }
}

// Initialize Google Drive Service
let googleDriveService = null;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize after a short delay to ensure other scripts are loaded
    setTimeout(() => {
        googleDriveService = new GoogleDriveService();
    }, 500);
});
