import { create } from 'zustand'
import type { User } from '../lib/types'

interface UserStore {
  currentUser: User | null
  setUser: (u: User | null) => void
}

export const useUserStore = create<UserStore>((set) => ({
  currentUser: null,
  setUser: (u) => set({ currentUser: u }),
}))
