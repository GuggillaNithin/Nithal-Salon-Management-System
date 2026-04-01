'use client';
import * as React from 'react';
import { Toast } from '@base-ui/react/toast';

const ToastContext = React.createContext<{
  showToast: (title: string, description?: string, type?: 'success' | 'error' | 'info') => void;
} | null>(null);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  // Use a ref to store the toast manager since it needs to be accessed in the provider
  return (
    <Toast.Provider>
      <ToastContent>
        {children}
      </ToastContent>
    </Toast.Provider>
  );
}

function ToastContent({ children }: { children: React.ReactNode }) {
  const toastManager = Toast.useToastManager();

  const showToast = React.useCallback((title: string, description?: string, type: 'success' | 'error' | 'info' = 'info') => {
    (toastManager as any).add({
      title,
      description,
      type
    });
  }, [toastManager]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed top-auto right-[1rem] bottom-[1rem] z-[100] mx-auto flex w-[250px] flex-col gap-4 sm:right-[2rem] sm:bottom-[2rem] sm:w-[320px]">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </ToastContext.Provider>
  );
}

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className={`relative z-[calc(1000-var(--toast-index))] w-full [transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+calc(min(var(--toast-index),10)*-15px)))_scale(calc(max(0,1-(var(--toast-index)*0.1))))] rounded-lg border p-4 shadow-lg transition-all [transition-property:opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] select-none after:absolute after:bottom-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-[''] data-[ending-style]:opacity-0 data-[expanded]:[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y)))] data-[limited]:opacity-0 data-[starting-style]:[transform:translateY(150%)] data-[ending-style]:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))] data-[expanded]:data-[ending-style]:data-[swipe-direction=down]:[transform:translateY(calc(var(--toast-swipe-movement-y)+150%))] data-[ending-style]:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))] data-[expanded]:data-[ending-style]:data-[swipe-direction=left]:[transform:translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))] data-[ending-style]:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))] data-[expanded]:data-[ending-style]:data-[swipe-direction=right]:[transform:translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))] data-[ending-style]:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))] data-[expanded]:data-[ending-style]:data-[swipe-direction=up]:[transform:translateY(calc(var(--toast-swipe-movement-y)-150%))] data-[ending-style]:[&:not([data-limited])]:[transform:translateY(150%)] 
      ${(toast as any).type === 'error' ? 'bg-red-50 border-red-200 text-red-900' : 
        (toast as any).type === 'success' ? 'bg-green-50 border-green-200 text-green-900' : 
        'bg-white border-gray-200 text-gray-900'}`}
      style={{
        ['--gap' as string]: '1rem',
        ['--offset-y' as string]:
          'calc(var(--toast-offset-y) * -1 + (var(--toast-index) * var(--gap) * -1) + var(--toast-swipe-movement-y))',
      }}
    >
      <div className="flex items-start gap-3">
        {(toast as any).type === 'success' && <SuccessIcon className="h-5 w-5 text-green-600 mt-0.5" />}
        {(toast as any).type === 'error' && <ErrorIcon className="h-5 w-5 text-red-600 mt-0.5" />}
        <div className="flex-1">
          <Toast.Title className="text-[0.975rem] leading-5 font-bold" />
          <Toast.Description className="text-[0.925rem] leading-5 opacity-90 mt-1" />
        </div>
      </div>
      <Toast.Close
        className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded border-none bg-transparent opacity-50 hover:opacity-100 hover:bg-black/5"
        aria-label="Close"
      >
        <XIcon className="h-4 w-4" />
      </Toast.Close>
    </Toast.Root>
  ));
}

function XIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
  );
}

function SuccessIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
  );
}

function ErrorIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
  );
}
