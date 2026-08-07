import { create } from 'zustand'

import { generateImage, type GeneratedImage, type ImageGenerationRequest } from '@/features/image-generation/api'

export type ImageGenerationSnapshot = {
  prompt: string
  model: string
  group: string
  size: string
  quality: string
  images: GeneratedImage[]
  status?: 'idle' | 'generating' | 'success' | 'error'
  error?: string
}

type ImageGenerationState = {
  snapshots: Record<string, ImageGenerationSnapshot | undefined>
  saveSnapshot: (key: string, snapshot: ImageGenerationSnapshot) => void
  startGeneration: (
    key: string,
    payload: ImageGenerationRequest,
    formatError: (cause: unknown) => string
  ) => void
}

const activeRequests = new Set<string>()

function persistSnapshot(key: string, snapshot: ImageGenerationSnapshot) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(key, JSON.stringify(snapshot))
  } catch {
    // Large base64 images can exceed the browser quota; memory state remains available.
  }
}

export const useImageGenerationStore = create<ImageGenerationState>()((set) => ({
  snapshots: {},
  saveSnapshot: (key, snapshot) => {
    persistSnapshot(key, snapshot)
    set((state) => ({
      snapshots: { ...state.snapshots, [key]: snapshot },
    }))
  },
  startGeneration: (key, payload, formatError) => {
    if (activeRequests.has(key)) return
    activeRequests.add(key)
    const runningSnapshot: ImageGenerationSnapshot = {
      prompt: payload.prompt,
      model: payload.model,
      group: payload.group,
      size: payload.size,
      quality: payload.quality,
      images: useImageGenerationStore.getState().snapshots[key]?.images ?? [],
      status: 'generating',
      error: undefined,
    }
    persistSnapshot(key, runningSnapshot)
    set((state) => ({ snapshots: { ...state.snapshots, [key]: runningSnapshot } }))

    void generateImage(payload)
      .then((images) => {
        if (!images.length) throw new Error('No image was returned')
        const successSnapshot: ImageGenerationSnapshot = {
          prompt: payload.prompt,
          model: payload.model,
          group: payload.group,
          size: payload.size,
          quality: payload.quality,
          images,
          status: 'success',
          error: undefined,
        }
        persistSnapshot(key, successSnapshot)
        set((state) => ({ snapshots: { ...state.snapshots, [key]: successSnapshot } }))
      })
      .catch((cause: unknown) => {
        const failedSnapshot: ImageGenerationSnapshot = {
          prompt: payload.prompt,
          model: payload.model,
          group: payload.group,
          size: payload.size,
          quality: payload.quality,
          images: useImageGenerationStore.getState().snapshots[key]?.images ?? [],
          status: 'error',
          error: formatError(cause),
        }
        persistSnapshot(key, failedSnapshot)
        set((state) => ({ snapshots: { ...state.snapshots, [key]: failedSnapshot } }))
      })
      .finally(() => activeRequests.delete(key))
  },
}))
