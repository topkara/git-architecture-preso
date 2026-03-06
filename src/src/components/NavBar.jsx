import { usePresentationStore } from '../store/usePresentationStore';
import { ChevronLeft, ChevronRight, MessageSquare, GitBranch, Home } from 'lucide-react';

export default function NavBar() {
  const { currentSlide, slides, nextSlide, prevSlide, setCurrentSlide, toggleSidebar, sidebarOpen, gitContext } = usePresentationStore();
  const slide = slides[currentSlide];
  const progress = slides.length > 1 ? (currentSlide / (slides.length - 1)) * 100 : 0;

  return (
    <nav className="navbar">
      <div className="nav-left">
        <button className="nav-btn icon-btn" onClick={() => setCurrentSlide(0)} title="Home">
          <Home size={18} />
        </button>
        {gitContext && (
          <div className="nav-git-badge">
            <GitBranch size={13} />
            <span>{gitContext.branch}</span>
            <code>{gitContext.lastCommit?.hash}</code>
          </div>
        )}
      </div>

      <div className="nav-center">
        <button className="nav-btn" onClick={prevSlide} disabled={currentSlide === 0}>
          <ChevronLeft size={18} />
        </button>

        <div className="slide-picker">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              className={`slide-dot ${idx === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(idx)}
              title={s.title}
            />
          ))}
        </div>

        <button className="nav-btn" onClick={nextSlide} disabled={currentSlide === slides.length - 1}>
          <ChevronRight size={18} />
        </button>

        <span className="slide-counter">{currentSlide + 1} / {slides.length}</span>
      </div>

      <div className="nav-right">
        <span className="slide-title-nav">{slide?.title}</span>
        <button
          className={`nav-btn icon-btn ${sidebarOpen ? 'active' : ''}`}
          onClick={toggleSidebar}
          title="Toggle design chat"
        >
          <MessageSquare size={18} />
        </button>
      </div>

      <div className="progress-bar" style={{ '--progress': `${progress}%` }} />
    </nav>
  );
}
