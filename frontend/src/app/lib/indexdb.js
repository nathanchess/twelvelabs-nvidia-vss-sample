export const initDb = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('vss-db', 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('videos')) {
                db.createObjectStore('videos', { keyPath: 'id', autoIncrement: true });
            }
        };
        request.onerror = (event) => {
            reject(event.target.error);
        };
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
    });
}

export const storeVideo = (db, videoFile) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('videos', 'readwrite');
        const store = transaction.objectStore('videos');
        const videoRecord = {
            video: videoFile,
            createdAt: new Date().toISOString(),
            name: videoFile.name,
        }
        const request = store.add(videoRecord);

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

export const getVideo = (db, videoId) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('videos', 'readonly');
        const store = transaction.objectStore('videos');
        const request = store.get(videoId);
        
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
        
        request.onerror = (event) => {
            reject(event.target.error);
        };
        
        transaction.onerror = (event) => {
            reject(event.target.error);
        };
    });
}
