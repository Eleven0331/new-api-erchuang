import { Headset, Send, ShieldCheck, UserRound } from 'lucide-react'
import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

type SupportMessage = {
  id: number
  sender_id: number
  sender_name: string
  content: string
  created_at: number
  is_staff: boolean
}

type SupportInbox = {
  messages: SupportMessage[]
  is_staff: boolean
  current_user_id: number
}

function formatMessageTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp * 1000))
}

export function CustomerService() {
  const { t } = useTranslation()
  const [inbox, setInbox] = useState<SupportInbox | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  const loadMessages = useCallback(async () => {
    try {
      const response = await api.get('/api/user/support/messages', {
        skipErrorHandler: true,
      })
      if (response.data?.success) setInbox(response.data.data)
    } catch {
      // The page remains usable while an operator rolls out the matching API.
    }
  }, [])

  useEffect(() => {
    void loadMessages()
    const interval = window.setInterval(() => void loadMessages(), 5000)
    return () => window.clearInterval(interval)
  }, [loadMessages])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || sending) return
    setSending(true)
    try {
      const response = await api.post('/api/user/support/messages', { content })
      if (response.data?.success) {
        setDraft('')
        await loadMessages()
      }
    } finally {
      setSending(false)
    }
  }

  const isStaff = inbox?.is_staff ?? false
  const currentUserId = inbox?.current_user_id

  return (
    <div className='flex size-full min-h-0 flex-col bg-background'>
      <header className='flex shrink-0 items-center justify-between border-b px-5 py-4 sm:px-8'>
        <div className='flex items-center gap-3'>
          <div className='flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary'>
            <Headset className='size-5' />
          </div>
          <div>
            <h1 className='text-base font-semibold'>{t('Customer Service')}</h1>
            <p className='text-muted-foreground text-xs'>
              {isStaff ? t('Customer service inbox') : t('Contact customer service')}
            </p>
          </div>
        </div>
        {isStaff && (
          <div className='text-muted-foreground flex items-center gap-1.5 text-xs'>
            <ShieldCheck className='size-4 text-primary' />
            {t('Reply as customer service')}
          </div>
        )}
      </header>

      <div className='min-h-0 flex-1 overflow-y-auto'>
        <div className='mx-auto flex w-full max-w-4xl flex-col gap-5 px-5 py-6 sm:px-8'>
          <div className='text-muted-foreground flex items-center gap-2 text-xs'>
            <span className='h-px flex-1 bg-border' />
            {t('Messages refresh automatically')}
            <span className='h-px flex-1 bg-border' />
          </div>
          {inbox?.messages.length ? (
            inbox.messages.map((message) => {
              const isOwnMessage = message.sender_id === currentUserId
              return (
                <article
                  key={message.id}
                  className={cn(
                    'flex max-w-[85%] items-end gap-2',
                    isOwnMessage && 'ml-auto flex-row-reverse'
                  )}
                >
                  <Avatar className='size-8 border'>
                    <AvatarFallback className='bg-muted text-xs'>
                      {message.is_staff ? <Headset className='size-4 text-primary' /> : <UserRound className='size-4' />}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn('space-y-1', isOwnMessage && 'text-right')}>
                    <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                      <span>{message.sender_name}</span>
                      <time>{formatMessageTime(message.created_at)}</time>
                    </div>
                    <p className={cn('rounded-lg px-3 py-2 text-sm leading-6 whitespace-pre-wrap', message.is_staff ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                      {message.content}
                    </p>
                  </div>
                </article>
              )
            })
          ) : (
            <div className='flex min-h-64 flex-col items-center justify-center gap-3 text-center'>
              <div className='flex size-12 items-center justify-center rounded-full bg-muted'>
                <Headset className='size-6 text-muted-foreground' />
              </div>
              <p className='font-medium'>{t('No support messages yet')}</p>
              <p className='text-muted-foreground max-w-sm text-sm'>{isStaff ? t('Customer service inbox') : t('Contact customer service')}</p>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className='shrink-0 border-t bg-background px-5 py-4 sm:px-8'>
        <div className='mx-auto flex w-full max-w-4xl items-end gap-3'>
          <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={t('Describe your issue...')} className='min-h-20 resize-none' maxLength={2000} />
          <Button type='submit' className='h-10 px-4' disabled={!draft.trim() || sending}>
            <Send />
            {isStaff ? t('Reply') : t('Send inquiry')}
          </Button>
        </div>
      </form>
    </div>
  )
}
