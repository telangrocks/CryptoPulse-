import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../contexts/AuthContext'
import { AppStateProvider } from '../../contexts/AppStateContext'
import AuthScreen from '../../components/AuthScreen'

// Mock Parse SDK
const mockParse = {
  User: {
    current: vi.fn(),
    logIn: vi.fn(),
    logOut: vi.fn(),
    signUp: vi.fn()
  },
  Cloud: {
    run: vi.fn()
  }
}

vi.mock('parse', () => ({
  default: mockParse
}))

// Mock Back4App config
vi.mock('../../back4app/config', () => ({
  Back4AppConfig: {
    appId: 'test-app-id',
    clientKey: 'test-client-key',
    masterKey: 'test-master-key',
    serverURL: 'https://test.back4app.com'
  },
  callBack4AppFunction: vi.fn()
}))

const I18nWithProviders = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppStateProvider>
        <AuthScreen />
      </AppStateProvider>
    </AuthProvider>
  </BrowserRouter>
)

describe('Internationalization Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('supports multiple languages', () => {
    render(<I18nWithProviders />)
    
    // Check for language selector
    const languageSelector = screen.getByRole('combobox', { name: /language/i })
    expect(languageSelector).toBeInTheDocument()
    
    // Check for available languages
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('Spanish')).toBeInTheDocument()
    expect(screen.getByText('French')).toBeInTheDocument()
  })

  it('switches language correctly', async () => {
    render(<I18nWithProviders />)
    
    const languageSelector = screen.getByRole('combobox', { name: /language/i })
    
    // Switch to Spanish
    fireEvent.change(languageSelector, { target: { value: 'es' } })
    
    await waitFor(() => {
      expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument()
      expect(screen.getByText('Correo Electrónico')).toBeInTheDocument()
      expect(screen.getByText('Contraseña')).toBeInTheDocument()
    })
  })

  it('handles RTL languages', async () => {
    render(<I18nWithProviders />)
    
    const languageSelector = screen.getByRole('combobox', { name: /language/i })
    
    // Switch to Arabic (RTL)
    fireEvent.change(languageSelector, { target: { value: 'ar' } })
    
    await waitFor(() => {
      const form = screen.getByRole('form')
      expect(form).toHaveAttribute('dir', 'rtl')
    })
  })

  it('formats numbers correctly', async () => {
    render(<I18nWithProviders />)
    
    const languageSelector = screen.getByRole('combobox', { name: /language/i })
    
    // Switch to German (uses different number format)
    fireEvent.change(languageSelector, { target: { value: 'de' } })
    
    await waitFor(() => {
      // Check that numbers are formatted correctly for German locale
      expect(screen.getByText('1.000,00')).toBeInTheDocument()
    })
  })

  it('formats dates correctly', async () => {
    render(<I18nWithProviders />)
    
    const languageSelector = screen.getByRole('combobox', { name: /language/i })
    
    // Switch to French (uses different date format)
    fireEvent.change(languageSelector, { target: { value: 'fr' } })
    
    await waitFor(() => {
      // Check that dates are formatted correctly for French locale
      expect(screen.getByText(/dimanche/i)).toBeInTheDocument()
    })
  })

  it('handles text direction changes', async () => {
    render(<I18nWithProviders />)
    
    const languageSelector = screen.getByRole('combobox', { name: /language/i })
    
    // Switch to Hebrew (RTL)
    fireEvent.change(languageSelector, { target: { value: 'he' } })
    
    await waitFor(() => {
      const form = screen.getByRole('form')
      expect(form).toHaveAttribute('dir', 'rtl')
    })
    
    // Switch back to English (LTR)
    fireEvent.change(languageSelector, { target: { value: 'en' } })
    
    await waitFor(() => {
      const form = screen.getByRole('form')
      expect(form).toHaveAttribute('dir', 'ltr')
    })
  })

  it('handles pluralization correctly', async () => {
    render(<I18nWithProviders />)
    
    const languageSelector = screen.getByRole('combobox', { name: /language/i })
    
    // Switch to Russian (has complex pluralization rules)
    fireEvent.change(languageSelector, { target: { value: 'ru' } })
    
    await waitFor(() => {
      // Check for correct plural forms
      expect(screen.getByText('1 сообщение')).toBeInTheDocument()
      expect(screen.getByText('2 сообщения')).toBeInTheDocument()
      expect(screen.getByText('5 сообщений')).toBeInTheDocument()
    })
  })

  it('handles currency formatting correctly', async () => {
    render(<I18nWithProviders />)
    
    const languageSelector = screen.getByRole('combobox', { name: /language/i })
    
    // Switch to Japanese (uses different currency format)
    fireEvent.change(languageSelector, { target: { value: 'ja' } })
    
    await waitFor(() => {
      // Check that currency is formatted correctly for Japanese locale
      expect(screen.getByText('¥1,000')).toBeInTheDocument()
    })
  })
})