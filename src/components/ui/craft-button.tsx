'use client'

import * as React from 'react'

import type { VariantProps } from 'class-variance-authority'

import { Button, type buttonVariants } from '@/components/ui/button'

import { cn } from '@/lib/utils'

const CraftButtonContext = React.createContext<{
  size?: VariantProps<typeof buttonVariants>['size']
  hoverTheme?: 'default' | 'spotify'
}>({})

interface CraftButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: VariantProps<typeof buttonVariants>['size']
  children?: React.ReactNode
  asChild?: boolean
  hoverTheme?: 'default' | 'spotify'
}

interface CraftButtonLabelProps {
  children: React.ReactNode
  className?: string
}

interface CraftButtonIconProps {
  children: React.ReactNode
  className?: string
}

function CraftButtonLabel({ children, className }: CraftButtonLabelProps) {
  const { hoverTheme } = React.useContext(CraftButtonContext)

  return (
    <span
      className={cn(
        'relative z-2 transition-colors duration-500',
        hoverTheme === 'spotify' ? 'group-hover:text-black' : 'group-hover:text-foreground',
        className
      )}
    >
      {children}
    </span>
  )
}

function CraftButtonIcon({ children, className }: CraftButtonIconProps) {
  const { size, hoverTheme } = React.useContext(CraftButtonContext)
  const iconSize = size === 'lg' ? 'size-6' : size === 'sm' ? 'size-4' : 'size-5'

  return (
    <span className={cn('relative z-1', iconSize, className)}>
      <span
        className={cn(
          'absolute inset-0 -z-1 rounded-full transition-transform duration-500 group-hover:scale-[15]',
          hoverTheme === 'spotify' ? 'bg-[#1DB954]' : 'bg-background',
          iconSize
        )}
      />
      <span
        className={cn(
          'relative z-2 flex items-center justify-center rounded-full transition-all duration-500',
          hoverTheme === 'spotify'
            ? 'bg-background text-primary group-hover:bg-[#1DB954] group-hover:text-black'
            : 'bg-background text-primary group-hover:bg-primary group-hover:text-background',
          iconSize
        )}
      >
        {children}
      </span>
    </span>
  )
}

function CraftButton(props: CraftButtonProps) {
  const { children, size, asChild = false, className, hoverTheme = 'default', ...rest } = props

  return (
    <CraftButtonContext.Provider value={{ size, hoverTheme }}>
      <Button
        size={size}
        asChild={asChild}
        className={cn(
          'group relative cursor-pointer overflow-hidden rounded-full duration-500 hover:shadow-md dark:border dark:border-transparent',
          hoverTheme === 'spotify' ? 'hover:bg-[#1DB954]' : 'hover:bg-background dark:hover:border-primary/30',
          className
        )}
        {...rest}
      >
        {children}
      </Button>
    </CraftButtonContext.Provider>
  )
}

export {
  CraftButton,
  CraftButtonLabel,
  CraftButtonIcon,
  type CraftButtonProps,
  type CraftButtonLabelProps,
  type CraftButtonIconProps
}
