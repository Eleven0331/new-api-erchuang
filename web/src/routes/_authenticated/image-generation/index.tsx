import { createFileRoute, redirect } from '@tanstack/react-router'

import { ImageGeneration } from '@/features/image-generation'
import { isSidebarModuleEnabled } from '@/lib/nav-modules'

export const Route = createFileRoute('/_authenticated/image-generation/')({
  beforeLoad: () => {
    if (!isSidebarModuleEnabled('chat', 'playground')) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: ImageGeneration,
})
