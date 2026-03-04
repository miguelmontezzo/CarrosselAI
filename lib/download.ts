// ═══════════════════════════════════════════════════════════════
// lib/download.ts — Funções utilitárias de Download
// Faz o proxy de CORS usando fetches blob e compila zip local
// ═══════════════════════════════════════════════════════════════
import JSZip from 'jszip'
import saveAs from 'file-saver'

/**
 * Obtém o Blob de uma URL pública bypassando restrições de domínios cruzados
 */
async function getBlobFromUrl(url: string): Promise<Blob> {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Falha ao baixar imagem: ' + response.statusText)
    return await response.blob()
}

/**
 * Força o download de uma imagem individual (ex: Slide 1)
 */
export async function downloadSingleImage(url: string, filename: string) {
    try {
        const blob = await getBlobFromUrl(url)
        saveAs(blob, filename)
    } catch (error) {
        console.error('Erro no download:', error)
        throw error
    }
}

/**
 * Compila e faz download de um Zip contendo todo o array de imagens
 */
export async function downloadAllImages(
    images: { url: string; nome: string }[],
    zipFilename: string,
    onProgress?: (progress: number) => void
) {
    try {
        const zip = new JSZip()
        const folder = zip.folder('slides')

        if (!folder) throw new Error('Não foi possível criar a pasta no zip.')

        // Fazemos os fetches em paralelo para agilizar
        let baixadas = 0
        await Promise.all(
            images.map(async (img) => {
                const blob = await getBlobFromUrl(img.url)
                folder.file(img.nome, blob)
                baixadas++
                onProgress?.(Math.round((baixadas / images.length) * 100))
            })
        )

        // Gera o arquivo zip assincronamente e inicia o download
        const content = await zip.generateAsync({ type: 'blob' })
        saveAs(content, zipFilename)
    } catch (error) {
        console.error('Erro ao zipar arquivos:', error)
        throw error
    }
}
