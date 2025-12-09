// Google Drive Integration Configuration

const GOOGLE_CONFIG = {
    // OAuth Client ID
    clientId: '407368352322-kpeng18q6t9v1c0h8jiprqq88o4aie2v.apps.googleusercontent.com',

    // API Scopes
    scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/spreadsheets'
    ],

    // Discovery docs
    discoveryDocs: [
        'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
        'https://sheets.googleapis.com/$discovery/rest?version=v4'
    ],

    // Root folder name in Google Drive
    rootFolderName: 'Photo Timestamp App',

    // Shared folder ID (all photos upload here)
    sharedFolderId: '1hWcLenRN88WjkDFT-n3Rl9xgUyToyovA',

    // Spreadsheet name for logging
    spreadsheetName: 'Photo Log',

    // Properties with GPS coordinates
    properties: [
        {
            name: 'Hillside Haven',
            address: '720 Bates Lane, Kodak, TN 37764',
            lat: 35.9561,
            lng: -83.6289,
            radius: 500 // meters
        },
        {
            name: 'The Rustic Rooster',
            address: '1128 Junaluska Way, Sevierville, TN 37876',
            lat: 35.8414,
            lng: -83.5242,
            radius: 500
        },
        {
            name: 'Smokey Creek Hideaway',
            address: '1430 School House Gap Road, Sevierville, TN 37876',
            lat: 35.7823,
            lng: -83.5981,
            radius: 500
        }
    ]
};

// Calculate distance between two GPS coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

// Detect which property based on GPS coordinates
function detectProperty(lat, lng) {
    for (const property of GOOGLE_CONFIG.properties) {
        const distance = calculateDistance(lat, lng, property.lat, property.lng);
        if (distance <= property.radius) {
            return property;
        }
    }
    return null; // Not near any property
}
