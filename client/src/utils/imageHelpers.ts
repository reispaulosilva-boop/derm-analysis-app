
/**
 * Helper function to handle image downloads, with specific support for iOS/Mobile.
 *
 * @param canvas The canvas element containing the image to save.
 * @param filename The desired filename for the saved image.
 */
export async function saveCanvasImage(canvas: HTMLCanvasElement, filename: string) {
    // 1. Convert canvas to blob
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));

    if (!blob) {
        console.error("Failed to create blob from canvas");
        return;
    }

    // 2. Try the Web Share API Level 2 (for mobile/iOS direct share/save)
    // This requires a File object and navigator.canShare support.
    if (navigator.share && navigator.canShare) {
        const file = new File([blob], filename, { type: 'image/jpeg' });
        const shareData = {
            files: [file],
            title: 'Análise Facial',
            text: 'Minha análise facial detalhada.'
        };

        if (navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
                return; // Success, we're done.
            } catch (err) {
                // Share API failed or was cancelled by user. Fallback to classic download.
                console.warn("Share API failed, falling back to download:", err);
            }
        }
    }

    // 3. Fallback: Classic "Anchor Tag" download (Desktop / some Androids)
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
}
