// ===== Google API Configuration =====

const GOOGLE_CONFIG = {
    // OAuth 2.0 Client ID (from Google Cloud Console)
    clientId: '407368352322-kpeng18q6t9v1c0h8jiprqq88o4aie2v.apps.googleusercontent.com',

    // Required OAuth scopes
    scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/spreadsheets'
    ],

    // Shared folder ID (parent folder for all uploads)
    sharedFolderId: '1hWcLenRN88WjkDFT-n3Rl9xgUyToyovA',

    // Photo Log spreadsheet ID (hardcoded - shared by all users)
    spreadsheetId: '1QlnAvL3671wMW5ta9jVU4K_G9QSE-kut57kAQ3uO6jU',

    // Property definitions with GPS coordinates and folder IDs
    properties: [
        {
            name: 'Happy Hollow',
            address: '57 Leatherstocking Ln, Gilmanton, NH 03237',
            lat: 43.4243,
            lng: -71.4145,
            folderId: '1raHDiHQ7E1zcVnjN7jRsixf2bL5wSwua'
        },
        {
            name: 'Meeker Hollow',
            address: '1494 Lower Meeker Hollow Rd, Roxbury, NY 12474',
            lat: 42.2709,
            lng: -74.5779,
            folderId: '1-oQL4luPvJe6LwQCjYVUmzEVwnqPXSJo'
        },
        {
            name: 'The Rustic Rooster',
            address: '1128 Junaluska Way, Sevierville, TN 37876',
            lat: 35.8414,
            lng: -83.5242,
            folderId: '17sZdBufQB_lYyn3jwr3K1jsUnokDW54J'
        },
        {
            name: 'Hillside Haven',
            address: '720 Bates Lane, Kodak, TN 37764',
            lat: 35.9561,
            lng: -83.6289,
            folderId: '1bLZes19Xf_VbAh2FZT6DeVQ5YDi6MvQ9'
        },
        {
            name: 'Smoky Creek Hideaway',
            address: '1430 School House Gap Road, Sevierville, TN 37876',
            lat: 35.7823,
            lng: -83.5981,
            folderId: '1Jiaosgsfvx9zvp2NOhwasPpZM5mGlu1N'
        }
    ],

    // Unknown Location folder (for photos outside property zones)
    unknownLocationFolderId: '1VGxcOHZwiKFgx1NVqB03Rsb5joHYhp-r',

    // Detection radius in meters (100m as requested)
    detectionRadiusMeters: 100
};

// Helper function to calculate distance between two GPS coordinates
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Function to detect which property the user is at based on GPS
function detectProperty(lat, lng) {
    for (const property of GOOGLE_CONFIG.properties) {
        const distance = calculateDistance(lat, lng, property.lat, property.lng);
        if (distance <= GOOGLE_CONFIG.detectionRadiusMeters) {
            return property;
        }
    }
    return null; // Not at any property
}
