import { useTranslation } from 'react-i18next'

export function CustomerService() {
  const { t } = useTranslation()

  return (
    <section className='flex min-h-full w-full items-start justify-center bg-background px-4 py-6 sm:px-8 sm:py-10'>
      <div className='group relative overflow-hidden rounded-lg border bg-white shadow-sm'>
        <span className='pointer-events-none absolute inset-x-8 top-0 h-px animate-pulse bg-primary/50' aria-hidden='true' />
        <img
          src='/customer-service.jpg'
          alt={t('Customer service QR code')}
          className='h-auto max-h-[calc(100vh-5rem)] w-auto max-w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.01]'
        />
      </div>
    </section>
  )
}
