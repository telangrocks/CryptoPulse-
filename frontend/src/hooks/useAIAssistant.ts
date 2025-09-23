import { logError, logWarn, logInfo, logDebug } from '../lib/logger'

import { useState, useCallback } from 'react'
import { callBack4AppFunction } from '../firebase/config'

interface AIResponse {
  success: boolean
  result?: {
    response: string
    category: 'trading' | 'technical' | 'risk' | 'general' | 'troubleshooting'
    suggestions?: string[]
    relatedFeatures?: string[]
  }
  error?: string
}

interface AIRecommendation {
  id: string
  title: string
  description: string
  action: string
  priority: 'high' | 'medium' | 'low'
  category: string
}

export function useAIAssistant() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processQuery = useCallback(async (query: string): Promise<AIResponse> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await callBack4AppFunction('processAIQuery', { query })
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process query'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getSuggestions = useCallback(async (category?: string): Promise<string[]> => {
    try {
      const response = await callBack4AppFunction('getAISuggestions', { category })
      return response.suggestions || []
    } catch (err) {
      logError('Failed to get suggestions:', err)
      return []
    }
  }, [])

  const getUserRecommendations = useCallback(async (): Promise<{ success: boolean; recommendations: AIRecommendation[] }> => {
    try {
      const response = await callBack4AppFunction('getUserRecommendations')
      return {
        success: true,
        recommendations: response.recommendations || []
      }
    } catch (err) {
      logError('Failed to get user recommendations:', err)
      return {
        success: false,
        recommendations: []
      }
    }
  }, [])

  const getPlatformStatus = useCallback(async () => {
    try {
      const response = await callBack4AppFunction('getPlatformStatus')
      return response
    } catch (err) {
      logError('Failed to get platform status:', err)
      return {
        success: false,
        status: 'offline'
      }
    }
  }, [])

  return {
    processQuery,
    getSuggestions,
    getUserRecommendations,
    getPlatformStatus,
    isLoading,
    error
  }
}
