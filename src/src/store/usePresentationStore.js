import { create } from 'zustand';

export const usePresentationStore = create((set, get) => ({
  currentSlide: 0,
  slides: [],
  gitContext: null,
  chatMessages: [],
  chatLoading: false,
  sidebarOpen: true,

  setSlides: (slides) => set({ slides }),
  setCurrentSlide: (idx) => set({ currentSlide: idx }),
  nextSlide: () => {
    const { currentSlide, slides } = get();
    if (currentSlide < slides.length - 1) set({ currentSlide: currentSlide + 1 });
  },
  prevSlide: () => {
    const { currentSlide } = get();
    if (currentSlide > 0) set({ currentSlide: currentSlide - 1 });
  },
  setGitContext: (ctx) => set({ gitContext: ctx }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  addMessage: (role, content) =>
    set((s) => ({
      chatMessages: [...s.chatMessages, { role, content, id: Date.now() }],
    })),
  setChatLoading: (v) => set({ chatLoading: v }),
  clearChat: () => set({ chatMessages: [] }),
}));
