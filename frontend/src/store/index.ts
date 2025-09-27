import { configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import { combineReducers } from '@reduxjs/toolkit'

// Import slices
import authSlice from './slices/authSlice'
import tradingSlice from './slices/tradingSlice'
import uiSlice from './slices/uiSlice'
import marketDataSlice from './slices/marketDataSlice'
import botSlice from './slices/botSlice'
import notificationSlice from './slices/notificationSlice'

// Persist config
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'ui', 'bot'], // Only persist these slices
}

const rootReducer = combineReducers({
  auth: authSlice,
  trading: tradingSlice,
  ui: uiSlice,
  marketData: marketDataSlice,
  bot: botSlice,
  notification: notificationSlice,
})

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware: any) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Typed hooks
export { useAppDispatch, useAppSelector } from './hooks'
