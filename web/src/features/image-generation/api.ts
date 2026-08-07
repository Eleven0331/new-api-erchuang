import { api, getUserGroups } from '@/lib/api'

export type ImageGenerationRequest = {
  model: string
  group: string
  prompt: string
  n: number
  size: string
  quality: string
  response_format: 'b64_json'
}

export type GeneratedImage = {
  url?: string
  b64_json?: string
  revised_prompt?: string
}

export type ImageGenerationGroupOption = {
  value: string
  label: string
  description?: string
}

export async function generateImage(
  payload: ImageGenerationRequest,
  signal?: AbortSignal
): Promise<GeneratedImage[]> {
  const response = await api.post('/pg/images/generations', payload, {
    signal,
    skipErrorHandler: true,
  } as Record<string, unknown>)
  const images = response.data?.data
  return Array.isArray(images) ? (images as GeneratedImage[]) : []
}

export async function getImageGenerationGroups(): Promise<ImageGenerationGroupOption[]> {
  const response = await getUserGroups()
  if (!response.success || !response.data) return []

  return Object.entries(response.data).map(([value, group]) => ({
    value,
    label: value,
    description: group.desc,
  }))
}
