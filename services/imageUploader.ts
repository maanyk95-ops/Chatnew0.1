const IMG_BB_API_KEY = '5fd2a4346ac2e5485a916a5d734d508b';

export const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMG_BB_API_KEY}`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Image upload failed due to a network error.');
    }

    const data = await response.json();
    
    if (data.success) {
        return data.data.display_url;
    } else {
        throw new Error(data.error?.message || 'Unknown error during image upload.');
    }
};
