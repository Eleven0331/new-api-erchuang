export type ImageGenerationSizeOption = {
  value: string
  label: string
  description: string
}

export const GPT_SIZE_OPTIONS: readonly ImageGenerationSizeOption[] = [
  { value: '1024x1024', label: '1:1', description: '1024 x 1024' },
  { value: '1536x1024', label: '3:2', description: '1536 x 1024' },
  { value: '1024x1536', label: '2:3', description: '1024 x 1536' },
] as const

export const GEMINI_SIZE_OPTIONS: readonly ImageGenerationSizeOption[] = [
  { value: '1:1', label: '1:1', description: 'Square' },
  { value: '16:9', label: '16:9', description: 'Landscape' },
  { value: '9:16', label: '9:16', description: 'Portrait' },
  { value: '4:3', label: '4:3', description: 'Classic landscape' },
  { value: '3:4', label: '3:4', description: 'Classic portrait' },
] as const

export const IMAGE_QUALITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const

export const IMAGE_GENERATION_GROUP_OPTIONS = [
  { value: 'Codex', label: 'Codex' },
  { value: 'Gemini', label: 'Gemini' },
] as const
