import { create } from 'zustand'

export const usePresentationStore = create((set, get) => ({
  currentSlide: 0,
  slides: [],
  manifest: null,
  gitContext: null,
  chatMessages: [],
  chatLoading: false,
  sidebarOpen: true,
  loading: true,
  error: null,

  setSlides: (slides) => set({ slides }),
  setManifest: (manifest) => set({ manifest }),
  setCurrentSlide: (idx) => set({ currentSlide: idx }),
  nextSlide: () => {
    const { currentSlide, slides } = get()
    if (currentSlide < slides.length - 1) set({ currentSlide: currentSlide + 1 })
  },
  prevSlide: () => {
    const { currentSlide } = get()
    if (currentSlide > 0) set({ currentSlide: currentSlide - 1 })
  },
  setGitContext: (ctx) => set({ gitContext: ctx }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setLoading: (v) => set({ loading: v }),
  setError: (e) => set({ error: e }),

  addMessage: (role, content) =>
    set((s) => ({
      chatMessages: [...s.chatMessages, { role, content, id: Date.now() + Math.random() }],
    })),

  // Append text to the last message (for streaming)
  updateLastMessage: (chunk) =>
    set((s) => {
      const msgs = [...s.chatMessages]
      if (msgs.length === 0) return {}
      const last = msgs[msgs.length - 1]
      msgs[msgs.length - 1] = { ...last, content: last.content + chunk }
      return { chatMessages: msgs }
    }),

  setChatLoading: (v) => set({ chatLoading: v }),
  clearChat: () => set({ chatMessages: [] }),
}))
