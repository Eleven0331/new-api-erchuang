import { createFileRoute, redirect } from '@tanstack/react-router'

import { ImageGeneration } from '@/features/image-generation'
import { GEMINI_SIZE_OPTIONS } from '@/features/image-generation/constants'
import { isSidebarModuleEnabled } from '@/lib/nav-modules'

const GEMINI_IMAGE_MODELS = [
  {
    value: 'gemini-3-pro-image-preview',
    label: 'gemini-3-pro-image-preview',
  },
  {
    value: 'gemini-3.1-flash-image-preview',
    label: 'gemini-3.1-flash-image-preview',
  },
] as const

export const Route = createFileRoute('/_authenticated/image-generation/gemini')({
  beforeLoad: () => {
    if (!isSidebarModuleEnabled('chat', 'playground')) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: () => (
    <ImageGeneration
      defaultModel='gemini-3-pro-image-preview'
      modelOptions={GEMINI_IMAGE_MODELS}
      titleKey='Gemini 生图'
      descriptionKey='Describe an image and let Gemini create it. Usage is charged to your wallet.'
      downloadPrefix='gemini-image'
      sizeOptions={GEMINI_SIZE_OPTIONS}
    />
  ),
})
