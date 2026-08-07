import {
  Download,
  Image as ImageIcon,
  LoaderCircle,
  Sparkles,
  WandSparkles,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Main } from '@/components/layout'
import { cn } from '@/lib/utils'
import { type ImageGenerationSnapshot, useImageGenerationStore } from '@/stores/image-generation-store'

import { getImageGenerationGroups, type GeneratedImage } from './api'
import {
  GPT_SIZE_OPTIONS,
  IMAGE_GENERATION_GROUP_OPTIONS,
  IMAGE_QUALITY_OPTIONS,
  type ImageGenerationSizeOption,
} from './constants'

type ImageModelOption = {
  value: string
  label: string
}

type ImageGenerationProps = {
  defaultModel?: string
  modelOptions?: readonly ImageModelOption[]
  titleKey?: string
  descriptionKey?: string
  downloadPrefix?: string
  sizeOptions?: readonly ImageGenerationSizeOption[]
}

function imageSource(image: GeneratedImage) {
  if (image.b64_json) return `data:image/png;base64,${image.b64_json}`
  return image.url ?? ''
}

function readSnapshot(key: string): Partial<ImageGenerationSnapshot> {
  if (typeof window === 'undefined') return {}
  try {
    const value = window.sessionStorage.getItem(key)
    if (!value) return {}
    const parsed = JSON.parse(value) as Partial<ImageGenerationSnapshot>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeSnapshot(key: string, snapshot: ImageGenerationSnapshot) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(key, JSON.stringify(snapshot))
  } catch {
    // Large base64 images may exceed session storage; the page still works for the current view.
  }
}

function getSnapshotStatus(generating: boolean, images: GeneratedImage[]) {
  if (generating) return 'generating' as const
  return images.length > 0 ? 'success' as const : 'idle' as const
}

function getGroupFallback(
  groups: { value: string }[],
  currentGroup: string
) {
  if (groups.some((group) => group.value === currentGroup)) return currentGroup
  return groups.find((group) => group.value === 'default')?.value ?? groups[0]?.value ?? currentGroup
}

export function ImageGeneration(props: ImageGenerationProps = {}) {
  const { t } = useTranslation()
  const defaultModel = props.defaultModel ?? 'gpt-image-2'
  const modelOptions = useMemo(
    () => props.modelOptions ?? [{ value: defaultModel, label: defaultModel }],
    [defaultModel, props.modelOptions]
  )
  const sizeOptions = useMemo(
    () => props.sizeOptions ?? GPT_SIZE_OPTIONS,
    [props.sizeOptions]
  )
  const titleKey = props.titleKey ?? 'GPT image 2生图'
  const descriptionKey = props.descriptionKey ?? 'Describe an image and let GPT image 2 create it. Usage is charged to your wallet.'
  const downloadPrefix = props.downloadPrefix ?? 'gpt-image-2'
  const storageKey = `image-generation:${downloadPrefix}`
  const memorySnapshot = useImageGenerationStore((state) => state.snapshots[storageKey])
  const saveMemorySnapshot = useImageGenerationStore((state) => state.saveSnapshot)
  const startGeneration = useImageGenerationStore((state) => state.startGeneration)
  const saved = memorySnapshot ?? readSnapshot(storageKey)
  const [prompt, setPrompt] = useState(saved.prompt ?? '')
  const [model, setModel] = useState(saved.model && modelOptions.some((option) => option.value === saved.model) ? saved.model : defaultModel)
  const [group, setGroup] = useState(saved.group ?? 'default')
  const [size, setSize] = useState(saved.size && sizeOptions.some((option) => option.value === saved.size) ? saved.size : sizeOptions[0]?.value ?? '1024x1024')
  const [quality, setQuality] = useState(saved.quality ?? 'medium')
  const [images, setImages] = useState<GeneratedImage[]>(Array.isArray(saved.images) ? saved.images : [])
  const [generating, setGenerating] = useState(saved.status === 'generating')
  const [error, setError] = useState(saved.error ?? '')
  const { data: groups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ['image-generation-groups'],
    queryFn: getImageGenerationGroups,
  })
  const groupOptions = useMemo(() => {
    const options = [...groups]
    for (const requiredGroup of IMAGE_GENERATION_GROUP_OPTIONS) {
      if (!options.some((option) => option.value === requiredGroup.value)) {
        options.push(requiredGroup)
      }
    }
    return options
  }, [groups])

  const snapshotStatus = getSnapshotStatus(generating, images)

  useEffect(() => {
    const snapshot = { prompt, model, group, size, quality, images, status: snapshotStatus, error: error || undefined }
    saveMemorySnapshot(storageKey, snapshot)
    writeSnapshot(storageKey, snapshot)
  }, [error, group, images, model, prompt, quality, saveMemorySnapshot, size, snapshotStatus, storageKey])

  useEffect(() => {
    if (!memorySnapshot) return
    setPrompt(memorySnapshot.prompt ?? '')
    setModel(memorySnapshot.model && modelOptions.some((option) => option.value === memorySnapshot.model) ? memorySnapshot.model : defaultModel)
    setGroup(memorySnapshot.group ?? 'default')
    setSize(memorySnapshot.size && sizeOptions.some((option) => option.value === memorySnapshot.size) ? memorySnapshot.size : sizeOptions[0]?.value ?? '1024x1024')
    setQuality(memorySnapshot.quality ?? 'medium')
    setImages(Array.isArray(memorySnapshot.images) ? memorySnapshot.images : [])
    setGenerating(memorySnapshot.status === 'generating')
    setError(memorySnapshot.error ?? '')
  }, [defaultModel, memorySnapshot, modelOptions, sizeOptions])

  useEffect(() => {
    if (!groupOptions.length) return
    setGroup((currentGroup) => getGroupFallback(groupOptions, currentGroup))
  }, [groupOptions])

  const handleGenerate = async () => {
    const value = prompt.trim()
    if (!value || generating) return
    setGenerating(true)
    setError('')
    startGeneration(storageKey, {
      model,
      group,
      prompt: value,
      n: 1,
      size,
      quality,
      response_format: 'b64_json',
    }, (cause) => {
      const responseMessage = (cause as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
      return responseMessage || (cause instanceof Error ? cause.message : t('Image generation failed'))
    })
  }

  return (
    <Main className='min-h-0 overflow-auto p-0'>
      <div className='mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-6 sm:px-8 sm:py-8'>
        <header className='flex flex-col gap-3 border-b pb-6 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <div className='mb-2 flex items-center gap-2 text-primary'>
              <WandSparkles className='size-5' />
              <span className='text-xs font-semibold tracking-widest uppercase'>{t('Image Generation Zone')}</span>
            </div>
            <h1 className='text-2xl font-semibold tracking-tight sm:text-3xl'>{t(titleKey)}</h1>
            <p className='text-muted-foreground mt-2 max-w-2xl text-sm leading-6'>{t(descriptionKey)}</p>
          </div>
          <div className='text-muted-foreground flex items-center gap-2 text-xs'>
            <Sparkles className='size-4 text-primary' />
            {t('Charged from your wallet')}
          </div>
        </header>

        <div className='border-primary/20 bg-primary/5 text-primary flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs leading-5'>
          <span className='size-1.5 shrink-0 animate-pulse rounded-full bg-primary' aria-hidden='true' />
          {t('Please save the image immediately after generation to avoid losing it.')}
        </div>

        <section className='grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]'>
          <div className='border-border/70 bg-card/40 flex flex-col gap-4 rounded-xl border p-4 sm:p-5'>
            <div className='flex items-center gap-2 text-sm font-medium'>
              <ImageIcon className='size-4 text-primary' />
              {t('What would you like to create?')}
            </div>
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={t('Describe the scene, style, lighting, and details...')}
              className='min-h-44 resize-y text-sm leading-6'
              maxLength={4000}
              disabled={generating}
            />
            <div className='text-muted-foreground flex items-center justify-between text-xs'>
              <span>{t('Be specific for better results')}</span>
              <span>{prompt.length}/4000</span>
            </div>
            <Button className='h-11 w-full sm:w-auto sm:self-end sm:px-7' onClick={() => void handleGenerate()} disabled={!prompt.trim() || generating}>
              {generating ? <LoaderCircle className='animate-spin' /> : <Sparkles />}
              {generating ? t('Generating...') : t('Generate image')}
            </Button>
            {error && <p className='text-destructive text-sm' role='alert'>{error}</p>}
          </div>

          <aside className='border-border/70 bg-card/40 flex flex-col gap-5 rounded-xl border p-4 sm:p-5'>
            <div>
              <h2 className='text-sm font-medium'>{t('Generation settings')}</h2>
              <p className='text-muted-foreground mt-1 text-xs'>{t('Fine-tune the output before generating')}</p>
            </div>
            {modelOptions.length > 1 && (
              <div className='space-y-2'>
                <label className='text-muted-foreground text-xs font-medium' htmlFor='image-model'>{t('Model')}</label>
                <select id='image-model' value={model} onChange={(event) => setModel(event.target.value)} className='border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm' disabled={generating}>
                  {modelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            )}
            <div className='space-y-2'>
              <label className='text-muted-foreground text-xs font-medium' htmlFor='image-group'>{t('Group')}</label>
              <select
                id='image-group'
                value={group}
                onChange={(event) => setGroup(event.target.value)}
                className='border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm'
                disabled={generating || isLoadingGroups}
              >
                {!groupOptions.some((option) => option.value === group) && <option value={group}>{group}</option>}
                {groupOptions.map((option) => <option key={option.value} value={option.value}>{option.label}{option.description ? ` - ${option.description}` : ''}</option>)}
              </select>
            </div>
            <div className='space-y-2'>
              <label className='text-muted-foreground text-xs font-medium' htmlFor='image-size'>{t('Canvas size')}</label>
              <select id='image-size' value={size} onChange={(event) => setSize(event.target.value)} className='border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm'>
                {sizeOptions.map((option) => <option key={option.value} value={option.value}>{option.label} ({option.description})</option>)}
              </select>
            </div>
            <div className='space-y-2'>
              <label className='text-muted-foreground text-xs font-medium' htmlFor='image-quality'>{t('Quality')}</label>
              <select id='image-quality' value={quality} onChange={(event) => setQuality(event.target.value)} className='border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm'>
                {IMAGE_QUALITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{t(option.label)}</option>)}
              </select>
            </div>
            <div className='border-border/70 text-muted-foreground mt-auto border-t pt-4 text-xs leading-5'>
              {t('The request uses your signed-in account and the selected image channel. Your wallet is charged only when the upstream request is settled.')}
            </div>
          </aside>
        </section>

        <section className='border-border/70 bg-card/20 relative min-h-72 overflow-hidden rounded-xl border p-4 sm:p-5'>
          {generating && <>
            <span className='auto-group-flow-border pointer-events-none absolute inset-0 opacity-70' aria-hidden='true' />
            <span className='pointer-events-none absolute inset-x-10 top-16 h-px overflow-hidden bg-primary/10' aria-hidden='true'>
              <span className='image-generation-scan block h-full w-1/4 bg-primary/60 blur-[1px]' />
            </span>
          </>}
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-sm font-medium'>{t('Generated image')}</h2>
            {images.length > 0 && <span className='text-muted-foreground text-xs'>{t('{{count}} result', { count: images.length })}</span>}
          </div>
          {images.length > 0 ? (
            <div className='grid gap-4 sm:grid-cols-2'>
              {images.map((image, index) => {
                const source = imageSource(image)
                return <article key={image.b64_json ?? image.url ?? image.revised_prompt ?? prompt} className='group relative overflow-hidden rounded-lg border bg-muted/30'>
                  <div className='relative'>
                    <img src={source} alt={image.revised_prompt || prompt} className='aspect-square w-full object-cover' />
                    {generating && <div className='absolute inset-0 flex items-center justify-center bg-background/25 backdrop-blur-[1px]'>
                      <span className='inline-flex items-center gap-2 rounded-full border bg-background/90 px-3 py-1.5 text-xs shadow-sm'>
                        <LoaderCircle className='size-3.5 animate-spin text-primary' />{t('Generating...')}
                      </span>
                    </div>}
                  </div>
                  <a href={source} download={`${downloadPrefix}-${index + 1}.png`} className='absolute right-3 bottom-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-background/90 px-3 text-xs font-medium opacity-0 shadow transition-opacity group-hover:opacity-100 focus:opacity-100'>
                    <Download className='size-4' />{t('Download')}
                  </a>
                </article>
              })}
            </div>
          ) : (
            <div className='text-muted-foreground flex min-h-56 flex-col items-center justify-center gap-3 text-center'>
              <div className='relative flex size-20 items-center justify-center rounded-full bg-muted/70'>
                {generating && <>
                  <span className='absolute inset-0 rounded-full border border-primary/25 animate-pulse' aria-hidden='true' />
                  <span className='absolute inset-2 rounded-full border border-primary/30 animate-spin [animation-duration:3s]' aria-hidden='true' />
                </>}
                <ImageIcon className={cn('size-7', generating && 'text-primary')} />
              </div>
              <p className='text-sm'>{generating ? t('Your image is being created...') : t('Your generated image will appear here')}</p>
            </div>
          )}
        </section>
      </div>
    </Main>
  )
}
