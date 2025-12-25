const TMDB_KEY = '2dca580c2a14b55200e784d157207b4d';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w300';

const App = () => {
  const [films, setFilms] = React.useState(() => {
    const saved = localStorage.getItem('cine_films');
    return saved ? JSON.parse(saved) : FILMS;
  });
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const [genre, setGenre] = React.useState('');
  const [selected, setSelected] = React.useState(null);
  const [view, setView] = React.useState('grid');
  const [cardSize, setCardSize] = React.useState(120);
  const [showAdd, setShowAdd] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // Save to localStorage
  React.useEffect(() => {
    localStorage.setItem('cine_films', JSON.stringify(films));
  }, [films]);

  // Fetch ALL posters on mount
  React.useEffect(() => {
    const fetchAllPosters = async () => {
      const needPoster = films.filter(f => !f.poster);
      if (needPoster.length === 0) return;
      
      setLoading(true);
      const updated = [...films];
      
      for (const film of needPoster) {
        try {
          const res = await fetch(
            `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(film.title)}&year=${film.year}`
          );
          const data = await res.json();
          if (data.results?.[0]?.poster_path) {
            const idx = updated.findIndex(f => f.id === film.id);
            if (idx !== -1) {
              updated[idx] = {...updated[idx], poster: TMDB_IMG + data.results[0].poster_path};
            }
          }
          // Small delay to avoid rate limiting
          await new Promise(r => setTimeout(r, 100));
        } catch(e) {}
      }
      setFilms(updated);
      setLoading(false);
    };
    fetchAllPosters();
  }, []);

  const genres = [...new Set(films.flatMap(f => f.genre ? f.genre.split(',').map(g => g.trim()) : []))].sort();

  const filtered = films.filter(f => {
    if (search && !f.title.toLowerCase().includes(search.toLowerCase()) && 
        !f.director?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'watched' && !f.watched) return false;
    if (filter === 'unwatched' && f.watched) return false;
    if (genre && !f.genre?.toLowerCase().includes(genre.toLowerCase())) return false;
    return true;
  }).sort((a, b) => b.year - a.year);

  const stats = { total: films.length, watched: films.filter(f => f.watched).length };

  const toggleWatch = (id, e) => {
    if (e) e.stopPropagation();
    setFilms(films.map(f => f.id === id ? {...f, watched: !f.watched} : f));
    if (selected?.id === id) setSelected({...selected, watched: !selected.watched});
  };

  const addFilm = (film) => {
    setFilms([film, ...films]);
  };

  const deleteFilm = (id) => {
    setFilms(films.filter(f => f.id !== id));
    setSelected(null);
  };

  return (
    <div>
      <header className="header">
        <div className="header-top">
          <div className="logo">Ciné<span>mathèque</span></div>
          <div className="header-right">
            <div className="stats"><b>{stats.total}</b> films · <b>{stats.watched}</b> vus</div>
            <button className="add-btn" onClick={() => setShowAdd(true)}>+ Ajouter</button>
          </div>
        </div>
        <div className="controls">
          <input 
            className="search-box" 
            placeholder="Rechercher..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Tous</button>
          <button className={`filter-btn ${filter === 'unwatched' ? 'active' : ''}`} onClick={() => setFilter('unwatched')}>À voir</button>
          <button className={`filter-btn ${filter === 'watched' ? 'active' : ''}`} onClick={() => setFilter('watched')}>Vus</button>
          <select value={genre} onChange={e => setGenre(e.target.value)}>
            <option value="">Genre</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <div className="view-controls">
            <button className={`view-btn ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}>▦</button>
            <button className={`view-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>☰</button>
            {view === 'grid' && (
              <input type="range" className="size-slider" min="80" max="160" value={cardSize} onChange={e => setCardSize(Number(e.target.value))} />
            )}
          </div>
        </div>
        {loading && <div className="loading-bar">Chargement des affiches...</div>}
      </header>

      <main className="main">
        <div className="count">{filtered.length} films</div>
        {filtered.length > 0 ? (
          view === 'grid' ? (
            <div className="grid" style={{'--card-size': cardSize + 'px'}}>
              {filtered.map(f => (
                <div key={f.id} className="card" onClick={() => setSelected(f)}>
                  {f.poster ? (
                    <>
                      <img className="card-img" src={f.poster} alt={f.title} />
                      <div className="card-info">
                        <div className="card-title">{f.title}</div>
                        <div className="card-year">{f.year}</div>
                      </div>
                    </>
                  ) : (
                    <div className="card-noimg">
                      <div className="card-title">{f.title}</div>
                      <div className="card-year">{f.year}</div>
                    </div>
                  )}
                  <div 
                    className={`watch-btn ${f.watched ? 'watched' : ''}`} 
                    onClick={e => toggleWatch(f.id, e)}
                  >✓</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="list">
              {filtered.map(f => (
                <div key={f.id} className="list-item" onClick={() => setSelected(f)}>
                  {f.poster ? (
                    <img className="list-poster" src={f.poster} alt="" />
                  ) : (
                    <div className="list-poster-empty">🎬</div>
                  )}
                  <div className="list-info">
                    <div className="list-title">{f.title}</div>
                    <div className="list-meta">{f.director} · {f.year}</div>
                  </div>
                  <div 
                    className={`watch-btn ${f.watched ? 'watched' : ''}`} 
                    onClick={e => toggleWatch(f.id, e)}
                  >✓</div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="empty">Aucun film trouvé</div>
        )}
      </main>

      {selected && (
        <div className="modal-bg" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-title">{selected.title}</div>
              <button className="modal-close" onClick={() => setSelected(null)}>×</button>
            </div>
            <div className="modal-body">
              {selected.poster && <img className="modal-poster" src={selected.poster} alt="" />}
              <div className="modal-meta">
                {selected.director} · {selected.year} {selected.country && `· ${selected.country}`}
              </div>
              {selected.genre && (
                <div className="modal-section">
                  <h4>Genre</h4>
                  <div>{selected.genre.split(',').map(g => <span key={g} className="tag">{g.trim()}</span>)}</div>
                </div>
              )}
              {selected.actors && (
                <div className="modal-section">
                  <h4>Casting</h4>
                  <p>{selected.actors}</p>
                </div>
              )}
              {selected.source && (
                <div className="modal-section">
                  <h4>Source</h4>
                  <p>{selected.source}</p>
                </div>
              )}
              <div className="modal-buttons">
                <button 
                  className={`btn ${selected.watched ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => toggleWatch(selected.id)}
                >
                  {selected.watched ? '✓ Vu' : 'Marquer vu'}
                </button>
                <button className="btn btn-danger" onClick={() => { if(confirm('Supprimer ce film ?')) deleteFilm(selected.id); }}>
                  🗑️
                </button>
              </div>
            </div>
            <div className="modal-actions">
              <a className="btn btn-secondary" href={`https://www.imdb.com/find?q=${encodeURIComponent(selected.title)}`} target="_blank">IMDb</a>
              <a className="btn btn-primary" href={`https://www.justwatch.com/fr/recherche?q=${encodeURIComponent(selected.title)}`} target="_blank">Où regarder</a>
            </div>
          </div>
        </div>
      )}

      {showAdd && <AddFilmModal onClose={() => setShowAdd(false)} onAdd={addFilm} />}
    </div>
  );
};

// Add Film Modal Component
const AddFilmModal = ({ onClose, onAdd }) => {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState([]);
  const [searching, setSearching] = React.useState(false);
  const [form, setForm] = React.useState({ title: '', director: '', year: '', genre: '', source: '', watched: false, poster: '' });
  const [mode, setMode] = React.useState('search'); // 'search' or 'manual'
  const timeoutRef = React.useRef(null);

  // Search TMDB
  React.useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!query || query.length < 2) { setResults([]); return; }
    
    timeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=fr-FR`);
        const data = await res.json();
        setResults(data.results?.slice(0, 6) || []);
      } catch(e) { setResults([]); }
      setSearching(false);
    }, 400);
  }, [query]);

  const selectMovie = async (movie) => {
    try {
      const [credits, details] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${TMDB_KEY}`).then(r => r.json()),
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${TMDB_KEY}&language=fr-FR`).then(r => r.json())
      ]);
      
      setForm({
        title: movie.title,
        director: credits.crew?.find(c => c.job === 'Director')?.name || '',
        year: movie.release_date?.split('-')[0] || '',
        genre: details.genres?.map(g => g.name).join(', ') || '',
        actors: credits.cast?.slice(0, 4).map(a => a.name).join(', ') || '',
        country: details.production_countries?.[0]?.name || '',
        source: '',
        watched: false,
        poster: movie.poster_path ? TMDB_IMG + movie.poster_path : ''
      });
      setMode('manual');
      setResults([]);
      setQuery('');
    } catch(e) {
      setForm({ ...form, title: movie.title, year: movie.release_date?.split('-')[0] || '' });
      setMode('manual');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title) return;
    onAdd({
      ...form,
      id: Date.now(),
      year: parseInt(form.year) || new Date().getFullYear()
    });
    onClose();
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal add-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">Ajouter un film</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {mode === 'search' && (
            <>
              <div className="search-input-wrap">
                <input
                  type="text"
                  className="search-box full"
                  placeholder="Rechercher un film..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  autoFocus
                />
                {searching && <div className="spinner"></div>}
              </div>
              
              {results.length > 0 && (
                <div className="search-results">
                  {results.map(m => (
                    <div key={m.id} className="search-result" onClick={() => selectMovie(m)}>
                      {m.poster_path ? (
                        <img src={TMDB_IMG + m.poster_path} alt="" />
                      ) : (
                        <div className="no-poster">🎬</div>
                      )}
                      <div>
                        <div className="result-title">{m.title}</div>
                        <div className="result-year">{m.release_date?.split('-')[0]}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <button className="link-btn" onClick={() => setMode('manual')}>
                Ou ajouter manuellement →
              </button>
            </>
          )}

          {mode === 'manual' && (
            <form onSubmit={handleSubmit}>
              {form.poster && (
                <div className="form-poster">
                  <img src={form.poster} alt="" />
                  <button type="button" onClick={() => { setForm({...form, poster: ''}); setMode('search'); }}>Changer</button>
                </div>
              )}
              
              <div className="form-grid">
                <label className="full">
                  <span>Titre *</span>
                  <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                </label>
                <label>
                  <span>Réalisateur</span>
                  <input type="text" value={form.director} onChange={e => setForm({...form, director: e.target.value})} />
                </label>
                <label>
                  <span>Année</span>
                  <input type="number" value={form.year} onChange={e => setForm({...form, year: e.target.value})} />
                </label>
                <label className="full">
                  <span>Genre</span>
                  <input type="text" value={form.genre} onChange={e => setForm({...form, genre: e.target.value})} placeholder="Drame, Action..." />
                </label>
                <label className="full">
                  <span>Source / Reco</span>
                  <input type="text" value={form.source} onChange={e => setForm({...form, source: e.target.value})} placeholder="Reco Dupontel..." />
                </label>
                <label className="checkbox">
                  <input type="checkbox" checked={form.watched} onChange={e => setForm({...form, watched: e.target.checked})} />
                  <span>Déjà vu</span>
                </label>
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={onClose}>Annuler</button>
                <button type="submit" className="btn btn-primary">Ajouter</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
