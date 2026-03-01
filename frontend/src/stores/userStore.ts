import { create } from 'zustand'
import { user } from '../../wailsjs/go/models'

interface UserStore {
  currentUser: user.User | null
  setUser: (u: user.User | null) => void
}

export const useUserStore = create<UserStore>((set) => ({
  currentUser: null,
  setUser: (u) => set({ currentUser: u }),
}))
