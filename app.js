const TMDB_KEY = '2dca580c2a14b55200e784d157207b4d';
const TMDB_IMG_SM = 'https://image.tmdb.org/t/p/w154';
const TMDB_IMG_LG = 'https://image.tmdb.org/t/p/w300';
const OMDB_KEY = '2a89ad59';
const SHEETS_API = 'https://script.google.com/macros/s/AKfycbwKSMuZksZwy6JLmBo9lq0kF9rwDkTP63_BY_a7czQHYiwuEJTWNUMJJiYZJCksNmjnUw/exec';

// Helper to get small poster URL for grid
const getSmallPoster = (url) => {
  if (!url) return null;
  return url.replace('/w300/', '/w154/').replace('/w500/', '/w154/');
};

// Helper to get large poster URL for modal
const getLargePoster = (url) => {
  if (!url) return null;
  return url.replace('/w154/', '/w300/').replace('/w92/', '/w300/');
};

// Fetch poster from TMDB then fallback to OMDb
const fetchPoster = async (title, year, type = 'movie') => {
  const endpoint = type === 'movie' ? 'search/movie' : 'search/tv';
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/${endpoint}?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}&year=${year}`
    );
    const data = await res.json();
    if (data.results?.[0]?.poster_path) {
      return TMDB_IMG_SM + data.results[0].poster_path;
    }
  } catch(e) {}
  
  if (type === 'movie') {
    try {
      const res = await fetch(
        `https://www.omdbapi.com/?apikey=${OMDB_KEY}&t=${encodeURIComponent(title)}&y=${year}&type=movie`
      );
      const data = await res.json();
      if (data.Poster && data.Poster !== 'N/A') {
        return data.Poster;
      }
    } catch(e) {}
  }
  
  return null;
};

const App = () => {
  const [tab, setTab] = React.useState('films');
  const [films, setFilms] = React.useState(() => {
    const cached = localStorage.getItem('cine_films_cache');
    return cached ? JSON.parse(cached) : [];
  });
  const [series, setSeries] = React.useState(() => {
    const cached = localStorage.getItem('cine_series_cache');
    return cached ? JSON.parse(cached) : [];
  });
  const [books, setBooks] = React.useState(() => {
    const cached = localStorage.getItem('cine_books_cache');
    return cached ? JSON.parse(cached) : [];
  });
  const [comics, setComics] = React.useState(() => {
    const cached = localStorage.getItem('cine_comics_cache');
    return cached ? JSON.parse(cached) : [];
  });
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const [genre, setGenre] = React.useState('');
  const [selected, setSelected] = React.useState(null);
  const [view, setView] = React.useState('grid');
  const [cardSize, setCardSize] = React.useState(120);
  const [showAdd, setShowAdd] = React.useState(false);
  const [showFix, setShowFix] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [lastSync, setLastSync] = React.useState(null);

  const items = tab === 'films' ? films : tab === 'series' ? series : tab === 'books' ? books : comics;
  const setItems = tab === 'films' ? setFilms : tab === 'series' ? setSeries : tab === 'books' ? setBooks : setComics;

  const [posterProgress, setPosterProgress] = React.useState('');

  // Load from Google Sheets on mount
  React.useEffect(() => {
    const cached = localStorage.getItem('cine_films_cache');
    if (!cached) setLoading(true);
    loadFromSheets();
  }, []);

  // Save to cache whenever data changes
  React.useEffect(() => {
    if (films.length > 0) {
      localStorage.setItem('cine_films_cache', JSON.stringify(films));
    }
  }, [films]);

  React.useEffect(() => {
    if (series.length > 0) {
      localStorage.setItem('cine_series_cache', JSON.stringify(series));
    }
  }, [series]);

  React.useEffect(() => {
    if (books.length > 0) {
      localStorage.setItem('cine_books_cache', JSON.stringify(books));
    }
  }, [books]);

  React.useEffect(() => {
    if (comics.length > 0) {
      localStorage.setItem('cine_comics_cache', JSON.stringify(comics));
    }
  }, [comics]);

  // Fetch missing posters after loading
  const fetchMissingPosters = async (filmsList) => {
    const needPoster = filmsList.filter(f => !f.poster);
    if (needPoster.length === 0) return filmsList;
    
    setPosterProgress(`0/${needPoster.length}`);
    const updated = [...filmsList];
    let count = 0;
    
    for (const film of needPoster) {
      count++;
      setPosterProgress(`${count}/${needPoster.length}`);
      
      const poster = await fetchPoster(film.title, film.year, 'movie');
      if (poster) {
        const idx = updated.findIndex(f => f.id === film.id);
        if (idx !== -1) {
          updated[idx] = {...updated[idx], poster};
        }
      }
      await new Promise(r => setTimeout(r, 200));
    }
    
    setPosterProgress('');
    return updated;
  };

  const loadFromSheets = async () => {
    setSyncing(true);
    try {
      const res = await fetch(SHEETS_API);
      const data = await res.json();
      
      let loadedFilms = data.filter(item => item.type === 'film' || !item.type).map(item => ({
        ...item,
        id: parseInt(item.id) || item.id,
        year: parseInt(item.year) || 0,
        watched: item.watched === 'true' || item.watched === true
      }));
      
      const loadedSeries = data.filter(item => item.type === 'series').map(item => ({
        ...item,
        id: parseInt(item.id) || item.id,
        year: parseInt(item.year) || 0,
        seasons: parseInt(item.seasons) || 0,
        watched: item.watched === 'true' || item.watched === true
      }));

      const loadedBooks = data.filter(item => item.type === 'book').map(item => ({
        ...item,
        id: parseInt(item.id) || item.id,
        year: parseInt(item.year) || 0,
        watched: item.watched === 'true' || item.watched === true
      }));

      const loadedComics = data.filter(item => item.type === 'comic').map(item => ({
        ...item,
        id: parseInt(item.id) || item.id,
        year: parseInt(item.year) || 0,
        watched: item.watched === 'true' || item.watched === true
      }));
      
      // Mettre à jour immédiatement avec les données du serveur
      setFilms(loadedFilms);
      setSeries(loadedSeries);
      setBooks(loadedBooks);
      setComics(loadedComics);
      setLoading(false);
      setSyncing(false);
      setLastSync(new Date());
      
      // Check if we need to fetch posters (en arrière-plan)
      const missingPosters = loadedFilms.filter(f => !f.poster).length;
      
      if (missingPosters > 0) {
        const updatedFilms = await fetchMissingPosters(loadedFilms);
        setFilms(updatedFilms);
        // Save updated films with posters to Sheets
        await saveToSheets(updatedFilms, loadedSeries);
      }
    } catch(e) {
      console.error('Erreur chargement:', e);
      setSyncing(false);
      setLoading(false);
    }
  };

  const saveToSheets = async (newFilms, newSeries, newBooks, newComics) => {
    setSyncing(true);
    try {
      const allData = [
        ...newFilms.map(f => ({...f, type: 'film'})),
        ...newSeries.map(s => ({...s, type: 'series'})),
        ...(newBooks || books).map(b => ({...b, type: 'book'})),
        ...(newComics || comics).map(c => ({...c, type: 'comic'}))
      ];
      
      await fetch(SHEETS_API, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allData)
      });
      
      setLastSync(new Date());
      
      // Also save to localStorage as backup
      localStorage.setItem('cine_films', JSON.stringify(newFilms));
      localStorage.setItem('cine_series', JSON.stringify(newSeries));
    } catch(e) {
      console.error('Erreur sauvegarde:', e);
    }
    setSyncing(false);
  };

  const [sort, setSort] = React.useState('year-desc');

  const genres = [...new Set(items.flatMap(f => f.genre ? f.genre.split(',').map(g => g.trim()) : []))].sort();

  const sortItems = (list) => {
    const sorted = [...list];
    switch(sort) {
      case 'alpha-asc':
        return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'fr'));
      case 'alpha-desc':
        return sorted.sort((a, b) => (b.title || '').localeCompare(a.title || '', 'fr'));
      case 'year-desc':
        return sorted.sort((a, b) => (b.year || 0) - (a.year || 0));
      case 'year-asc':
        return sorted.sort((a, b) => (a.year || 0) - (b.year || 0));
      case 'director':
        return sorted.sort((a, b) => (a.director || a.creator || a.author || '').localeCompare(b.director || b.creator || b.author || '', 'fr'));
      case 'added':
        return sorted.sort((a, b) => (b.id || 0) - (a.id || 0));
      case 'unwatched':
        return sorted.sort((a, b) => {
          if (a.watched === b.watched) return (b.year || 0) - (a.year || 0);
          return a.watched ? 1 : -1;
        });
      default:
        return sorted;
    }
  };

  const filtered = sortItems(items.filter(f => {
    if (search && !f.title?.toLowerCase().includes(search.toLowerCase()) && 
        !f.director?.toLowerCase().includes(search.toLowerCase()) &&
        !f.author?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'watched' && !f.watched) return false;
    if (filter === 'unwatched' && f.watched) return false;
    if (genre && !f.genre?.toLowerCase().includes(genre.toLowerCase())) return false;
    return true;
  }));

  // Group items by separator
  const getGroupKey = (item) => {
    switch(sort) {
      case 'alpha-asc':
      case 'alpha-desc':
        return (item.title || '')[0]?.toUpperCase() || '#';
      case 'year-desc':
      case 'year-asc':
        const decade = Math.floor((item.year || 0) / 10) * 10;
        return decade > 0 ? `${decade}s` : 'Inconnu';
      case 'director':
        return (item.director || item.creator || item.author || 'Inconnu')[0]?.toUpperCase() || '#';
      case 'unwatched':
        return item.watched ? (tab === 'books' || tab === 'comics' ? 'Lus' : 'Vus') : (tab === 'books' || tab === 'comics' ? 'À lire' : 'À voir');
      default:
        return null;
    }
  };

  const groupedItems = React.useMemo(() => {
    if (sort === 'added') return [{ key: null, items: filtered }];
    
    const groups = [];
    let currentKey = null;
    
    filtered.forEach(item => {
      const key = getGroupKey(item);
      if (key !== currentKey) {
        groups.push({ key, items: [item] });
        currentKey = key;
      } else {
        groups[groups.length - 1].items.push(item);
      }
    });
    
    return groups;
  }, [filtered, sort, tab]);

  const stats = { 
    total: items.length, 
    watched: items.filter(f => f.watched).length 
  };

  const saveAll = (newFilms, newSeries, newBooks, newComics) => {
    saveToSheets(
      newFilms !== undefined ? newFilms : films,
      newSeries !== undefined ? newSeries : series,
      newBooks !== undefined ? newBooks : books,
      newComics !== undefined ? newComics : comics
    );
  };

  const toggleWatch = (id, e) => {
    if (e) e.stopPropagation();
    const newItems = items.map(f => f.id === id ? {...f, watched: !f.watched} : f);
    setItems(newItems);
    if (selected?.id === id) setSelected({...selected, watched: !selected.watched});
    
    // Save to sheets
    if (tab === 'films') saveAll(newItems, undefined, undefined, undefined);
    else if (tab === 'series') saveAll(undefined, newItems, undefined, undefined);
    else if (tab === 'books') saveAll(undefined, undefined, newItems, undefined);
    else saveAll(undefined, undefined, undefined, newItems);
  };

  const addItem = (item) => {
    const newItems = [item, ...items];
    setItems(newItems);
    
    if (tab === 'films') saveAll(newItems, undefined, undefined, undefined);
    else if (tab === 'series') saveAll(undefined, newItems, undefined, undefined);
    else if (tab === 'books') saveAll(undefined, undefined, newItems, undefined);
    else saveAll(undefined, undefined, undefined, newItems);
  };

  const deleteItem = (id) => {
    const newItems = items.filter(f => f.id !== id);
    setItems(newItems);
    setSelected(null);
    
    if (tab === 'films') saveAll(newItems, undefined, undefined, undefined);
    else if (tab === 'series') saveAll(undefined, newItems, undefined, undefined);
    else if (tab === 'books') saveAll(undefined, undefined, newItems, undefined);
    else saveAll(undefined, undefined, undefined, newItems);
  };

  const updatePoster = (id, updates) => {
    // updates peut être {poster, title, year} ou juste {poster}
    const newItems = items.map(f => {
      if (f.id === id) {
        return {
          ...f,
          poster: updates.poster || f.poster,
          title: updates.title || f.title,
          year: updates.year || f.year
        };
      }
      return f;
    });
    setItems(newItems);
    if (selected?.id === id) {
      setSelected({
        ...selected,
        poster: updates.poster || selected.poster,
        title: updates.title || selected.title,
        year: updates.year || selected.year
      });
    }
    setShowFix(false);
    
    if (tab === 'films') saveAll(newItems, undefined, undefined, undefined);
    else if (tab === 'series') saveAll(undefined, newItems, undefined, undefined);
    else if (tab === 'books') saveAll(undefined, undefined, newItems, undefined);
    else saveAll(undefined, undefined, undefined, newItems);
  };

  if (loading && films.length === 0) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <div>Chargement de ta cinémathèque...</div>
      </div>
    );
  }

  return (
    <div>
      <header className="header">
        <div className="header-top">
          <div className="logo">Ciné<span>mathèque</span></div>
          <div className="header-right">
            <div className="stats">
              <b>{stats.total}</b> {tab} · <b>{stats.watched}</b> {tab === 'books' || tab === 'comics' ? (stats.watched > 1 ? 'lus' : 'lu') : (stats.watched > 1 ? 'vus' : 'vu')}
              {syncing && <span className="sync-icon"> ⟳</span>}
            </div>
            <button className="add-btn" onClick={() => setShowAdd(true)}>+ Ajouter</button>
          </div>
        </div>
        
        {posterProgress && <div className="poster-progress">Téléchargement des affiches... {posterProgress}</div>}
        
        <div className="tabs">
          <button className={`tab ${tab === 'films' ? 'active' : ''}`} onClick={() => { setTab('films'); setGenre(''); }}>
            🎬 <span className="tab-label">Films</span> <span className="tab-count">{films.length}</span>
          </button>
          <button className={`tab ${tab === 'series' ? 'active' : ''}`} onClick={() => { setTab('series'); setGenre(''); }}>
            📺 <span className="tab-label">Séries</span> <span className="tab-count">{series.length}</span>
          </button>
          <button className={`tab ${tab === 'books' ? 'active' : ''}`} onClick={() => { setTab('books'); setGenre(''); }}>
            📚 <span className="tab-label">Livres</span> <span className="tab-count">{books.length}</span>
          </button>
          <button className={`tab ${tab === 'comics' ? 'active' : ''}`} onClick={() => { setTab('comics'); setGenre(''); }}>
            📖 <span className="tab-label">BD</span> <span className="tab-count">{comics.length}</span>
          </button>
        </div>
        
        <div className="controls">
          <input 
            className="search-box" 
            placeholder="Rechercher..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Tous</button>
          <button className={`filter-btn ${filter === 'unwatched' ? 'active' : ''}`} onClick={() => setFilter('unwatched')}>{tab === 'books' || tab === 'comics' ? 'À lire' : 'À voir'}</button>
          <button className={`filter-btn ${filter === 'watched' ? 'active' : ''}`} onClick={() => setFilter('watched')}>{tab === 'books' || tab === 'comics' ? 'Lus' : 'Vus'}</button>
          <select value={genre} onChange={e => setGenre(e.target.value)}>
            <option value="">Genre</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)} className="sort-select">
            <option value="year-desc">Année ↓</option>
            <option value="year-asc">Année ↑</option>
            <option value="alpha-asc">A → Z</option>
            <option value="alpha-desc">Z → A</option>
            <option value="director">{tab === 'films' ? 'Réalisateur' : tab === 'series' ? 'Créateur' : 'Auteur'}</option>
            <option value="added">Ajout récent</option>
            <option value="unwatched">{tab === 'books' || tab === 'comics' ? 'Non lus d\'abord' : 'Non vus d\'abord'}</option>
          </select>
          <div className="view-controls">
            <button className={`view-btn ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}>▦</button>
            <button className={`view-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>☰</button>
            {view === 'grid' && (
              <input type="range" className="size-slider" min="80" max="160" value={cardSize} onChange={e => setCardSize(Number(e.target.value))} />
            )}
          </div>
        </div>
      </header>

      <main className="main">
        <div className="count">{filtered.length} {tab}</div>
        {filtered.length > 0 ? (
          view === 'grid' ? (
            <div className="grid-container">
              {groupedItems.map((group, gi) => (
                <React.Fragment key={gi}>
                  {group.key && <div className="group-separator">{group.key}</div>}
                  <div className="grid" style={{'--card-size': cardSize + 'px'}}>
                    {group.items.map(f => (
                      <div key={f.id} className="card" onClick={() => setSelected(f)}>
                        {f.poster ? (
                          <>
                            <img className="card-img" src={getSmallPoster(f.poster)} alt={f.title} loading="lazy" />
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
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div className="list-container">
              {groupedItems.map((group, gi) => (
                <React.Fragment key={gi}>
                  {group.key && <div className="group-separator">{group.key}</div>}
                  <div className="list">
                    {group.items.map(f => (
                      <div key={f.id} className="list-item" onClick={() => setSelected(f)}>
                        {f.poster ? (
                          <img className="list-poster" src={getSmallPoster(f.poster)} alt="" loading="lazy" />
                        ) : (
                          <div className="list-poster-empty">{tab === 'films' ? '🎬' : tab === 'series' ? '📺' : tab === 'books' ? '📚' : '📖'}</div>
                        )}
                        <div className="list-info">
                          <div className="list-title">{f.title}</div>
                          <div className="list-meta">{f.director || f.creator || f.author} · {f.year}</div>
                        </div>
                        <div 
                          className={`watch-btn ${f.watched ? 'watched' : ''}`} 
                          onClick={e => toggleWatch(f.id, e)}
                        >✓</div>
                      </div>
                    ))}
                  </div>
                </React.Fragment>
              ))}
            </div>
          )
        ) : (
          <div className="empty">
            {items.length === 0 
              ? `Aucun ${tab === 'films' ? 'film' : tab === 'series' ? 'série' : tab === 'books' ? 'livre' : 'BD'} ajouté. Clique sur "+ Ajouter" !`
              : 'Aucun résultat'
            }
          </div>
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
              {selected.poster && <img className="modal-poster" src={getLargePoster(selected.poster)} alt="" />}
              <div className="modal-meta">
                {selected.director || selected.creator || selected.author} · {selected.year} {selected.country && `· ${selected.country}`}
              </div>
              {selected.seasons && (
                <div className="modal-section">
                  <h4>Saisons</h4>
                  <p>{selected.seasons} saison{selected.seasons > 1 ? 's' : ''}</p>
                </div>
              )}
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
                  {selected.watched ? (tab === 'books' || tab === 'comics' ? '✓ Lu' : '✓ Vu') : (tab === 'books' || tab === 'comics' ? 'Marquer lu' : 'Marquer vu')}
                </button>
                <button className="btn btn-secondary" onClick={() => setShowFix(true)}>
                  🖼️
                </button>
                <button className="btn btn-danger" onClick={() => { if(confirm('Supprimer ?')) deleteItem(selected.id); }}>
                  🗑️
                </button>
              </div>
            </div>
            <div className="modal-actions">
              {(tab === 'films' || tab === 'series') ? (
                <>
                  <a className="btn btn-secondary" href={`https://www.imdb.com/find?q=${encodeURIComponent(selected.title)}`} target="_blank">IMDb</a>
                  <a className="btn btn-primary" href={`https://www.justwatch.com/fr/recherche?q=${encodeURIComponent(selected.title)}`} target="_blank">Où regarder</a>
                </>
              ) : (
                <>
                  <a className="btn btn-secondary" href={`https://www.goodreads.com/search?q=${encodeURIComponent(selected.title)}`} target="_blank">Goodreads</a>
                  <a className="btn btn-primary" href={`https://www.babelio.com/recherche.php?Recherche=${encodeURIComponent(selected.title)}`} target="_blank">Babelio</a>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showAdd && <AddModal type={tab} onClose={() => setShowAdd(false)} onAdd={addItem} />}
      {showFix && selected && <FixPosterModal item={selected} type={tab} onClose={() => setShowFix(false)} onSelect={updatePoster} />}
    </div>
  );
};

// Fix Poster Modal
const FixPosterModal = ({ item, type, onClose, onSelect }) => {
  const [query, setQuery] = React.useState(item.title);
  const [year, setYear] = React.useState(item.year || '');
  const [results, setResults] = React.useState([]);
  const [searching, setSearching] = React.useState(false);
  const [source, setSource] = React.useState('tmdb');
  const [manualUrl, setManualUrl] = React.useState('');
  const [showManual, setShowManual] = React.useState(false);

  const doSearch = async () => {
    if (!query) return;
    setSearching(true);
    setResults([]);
    
    if (source === 'tmdb') {
      const endpoint = type === 'films' ? 'search/movie' : 'search/tv';
      const yearParam = year ? `&year=${year}` : '';
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/${endpoint}?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}${yearParam}`
        );
        const data = await res.json();
        setResults(data.results?.slice(0, 12).map(m => ({
          id: m.id,
          title: m.title || m.name,
          year: (m.release_date || m.first_air_date)?.split('-')[0],
          poster: m.poster_path ? TMDB_IMG_SM + m.poster_path : null,
          source: 'TMDB'
        })) || []);
      } catch(e) {}
    } else {
      const omdbType = type === 'films' ? 'movie' : 'series';
      const yearParam = year ? `&y=${year}` : '';
      try {
        const res = await fetch(
          `https://www.omdbapi.com/?apikey=${OMDB_KEY}&s=${encodeURIComponent(query)}&type=${omdbType}${yearParam}`
        );
        const data = await res.json();
        if (data.Search) {
          setResults(data.Search.slice(0, 12).map(m => ({
            id: m.imdbID,
            title: m.Title,
            year: m.Year,
            poster: m.Poster !== 'N/A' ? m.Poster : null,
            source: 'OMDb'
          })));
        }
      } catch(e) {}
    }
    setSearching(false);
  };

  React.useEffect(() => {
    doSearch();
  }, [source]);

  const applyManualUrl = () => {
    if (manualUrl && manualUrl.startsWith('http')) {
      onSelect(item.id, { poster: manualUrl });
    }
  };

  const selectResult = (r) => {
    if (!r.poster) return;
    onSelect(item.id, {
      poster: r.poster,
      title: r.title,
      year: parseInt(r.year) || item.year
    });
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal fix-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">Corriger le film</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="fix-search">
            <input
              type="text"
              className="search-box"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder="Titre"
              style={{flex: 1}}
            />
            <input
              type="number"
              className="search-box year-input"
              value={year}
              onChange={e => setYear(e.target.value)}
              placeholder="Année"
            />
            <button className="btn btn-primary" onClick={doSearch}>🔍</button>
          </div>
          
          <div className="source-toggle">
            <button className={`source-btn ${source === 'tmdb' ? 'active' : ''}`} onClick={() => setSource('tmdb')}>TMDB</button>
            <button className={`source-btn ${source === 'omdb' ? 'active' : ''}`} onClick={() => setSource('omdb')}>OMDb/IMDb</button>
          </div>
          
          {searching && <div className="searching">Recherche...</div>}
          
          <div className="fix-results">
            {results.map(r => (
              <div 
                key={r.id} 
                className={`fix-result ${!r.poster ? 'no-poster' : ''}`}
                onClick={() => selectResult(r)}
              >
                {r.poster ? (
                  <img src={r.poster} alt="" />
                ) : (
                  <div className="fix-no-poster">Pas d'affiche</div>
                )}
                <div className="fix-result-info">
                  <div className="fix-result-title">{r.title}</div>
                  <div className="fix-result-year">{r.year} · {r.source}</div>
                </div>
              </div>
            ))}
          </div>
          
          {results.length === 0 && !searching && (
            <div className="empty-small">Aucun résultat. Essayez le titre original.</div>
          )}
          
          <div className="manual-section">
            <button className="link-btn" onClick={() => setShowManual(!showManual)}>
              {showManual ? '▼ Masquer' : '▶ Coller une URL'}
            </button>
            {showManual && (
              <div className="manual-url">
                <input
                  type="text"
                  className="search-box"
                  value={manualUrl}
                  onChange={e => setManualUrl(e.target.value)}
                  placeholder="https://..."
                  style={{flex: 1}}
                />
                <button className="btn btn-primary" onClick={applyManualUrl}>OK</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Add Modal
const AddModal = ({ type, onClose, onAdd }) => {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState([]);
  const [searching, setSearching] = React.useState(false);
  const [form, setForm] = React.useState({ 
    title: '', director: '', creator: '', author: '', year: '', genre: '', source: '', 
    watched: false, poster: '', seasons: '' 
  });
  const [mode, setMode] = React.useState('search');
  const timeoutRef = React.useRef(null);

  const isFilm = type === 'films';
  const isSeries = type === 'series';
  const isBook = type === 'books';
  const isComic = type === 'comics';
  const isMedia = isFilm || isSeries;

  React.useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!query || query.length < 2) { setResults([]); return; }
    
    timeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        if (isMedia) {
          const endpoint = isFilm ? 'search/movie' : 'search/tv';
          const res = await fetch(`https://api.themoviedb.org/3/${endpoint}?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=fr-FR`);
          const data = await res.json();
          setResults(data.results?.slice(0, 8) || []);
        } else {
          // Google Books API pour livres et BD
          const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8&langRestrict=fr`);
          const data = await res.json();
          setResults(data.items?.map(item => ({
            id: item.id,
            title: item.volumeInfo.title,
            author: item.volumeInfo.authors?.join(', ') || '',
            year: item.volumeInfo.publishedDate?.split('-')[0] || '',
            poster: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
            genre: item.volumeInfo.categories?.join(', ') || ''
          })) || []);
        }
      } catch(e) { setResults([]); }
      setSearching(false);
    }, 400);
  }, [query]);

  const selectItem = async (item) => {
    if (isMedia) {
      try {
        const detailEndpoint = isFilm ? `movie/${item.id}` : `tv/${item.id}`;
        const creditEndpoint = isFilm ? `movie/${item.id}/credits` : `tv/${item.id}/credits`;
        
        const [details, credits] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/${detailEndpoint}?api_key=${TMDB_KEY}&language=fr-FR`).then(r => r.json()),
          fetch(`https://api.themoviedb.org/3/${creditEndpoint}?api_key=${TMDB_KEY}`).then(r => r.json())
        ]);
        
        if (isFilm) {
          setForm({
            title: item.title,
            director: credits.crew?.find(c => c.job === 'Director')?.name || '',
            year: item.release_date?.split('-')[0] || '',
            genre: details.genres?.map(g => g.name).join(', ') || '',
            actors: credits.cast?.slice(0, 4).map(a => a.name).join(', ') || '',
            country: details.production_countries?.[0]?.name || '',
            source: '',
            watched: false,
            poster: item.poster_path ? TMDB_IMG_SM + item.poster_path : ''
          });
        } else {
          setForm({
            title: item.name,
            creator: details.created_by?.[0]?.name || '',
            year: item.first_air_date?.split('-')[0] || '',
            genre: details.genres?.map(g => g.name).join(', ') || '',
            actors: credits.cast?.slice(0, 4).map(a => a.name).join(', ') || '',
            country: details.origin_country?.[0] || '',
            seasons: details.number_of_seasons || '',
            source: '',
            watched: false,
            poster: item.poster_path ? TMDB_IMG_SM + item.poster_path : ''
          });
        }
      } catch(e) {
        setForm({ ...form, title: item.title || item.name, year: (item.release_date || item.first_air_date)?.split('-')[0] || '' });
      }
    } else {
      // Livre ou BD
      setForm({
        title: item.title,
        author: item.author || '',
        year: item.year || '',
        genre: item.genre || '',
        source: '',
        watched: false,
        poster: item.poster || ''
      });
    }
    setMode('manual');
    setResults([]);
    setQuery('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title) return;
    onAdd({
      ...form,
      id: Date.now(),
      year: parseInt(form.year) || new Date().getFullYear(),
      seasons: form.seasons ? parseInt(form.seasons) : undefined
    });
    onClose();
  };

  const getTypeLabel = () => {
    if (isFilm) return 'un film';
    if (isSeries) return 'une série';
    if (isBook) return 'un livre';
    return 'une BD';
  };

  const getIcon = () => {
    if (isFilm) return '🎬';
    if (isSeries) return '📺';
    if (isBook) return '📚';
    return '📖';
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal add-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">Ajouter {getTypeLabel()}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {mode === 'search' && (
            <>
              <div className="search-input-wrap">
                <input
                  type="text"
                  className="search-box full"
                  placeholder={`Rechercher ${getTypeLabel()}...`}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  autoFocus
                />
                {searching && <div className="spinner"></div>}
              </div>
              
              {results.length > 0 && (
                <div className="search-results">
                  {results.map(m => (
                    <div key={m.id} className="search-result" onClick={() => selectItem(m)}>
                      {(isMedia ? m.poster_path : m.poster) ? (
                        <img src={isMedia ? TMDB_IMG_SM + m.poster_path : m.poster} alt="" />
                      ) : (
                        <div className="no-poster">{getIcon()}</div>
                      )}
                      <div>
                        <div className="result-title">{m.title || m.name}</div>
                        <div className="result-year">
                          {isMedia ? (m.release_date || m.first_air_date)?.split('-')[0] : m.year}
                          {!isMedia && m.author && ` · ${m.author}`}
                        </div>
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
                  <span>{isFilm ? 'Réalisateur' : isSeries ? 'Créateur' : 'Auteur'}</span>
                  <input type="text" value={isFilm ? form.director : isSeries ? form.creator : form.author} onChange={e => setForm({...form, [isFilm ? 'director' : isSeries ? 'creator' : 'author']: e.target.value})} />
                </label>
                <label>
                  <span>Année</span>
                  <input type="number" value={form.year} onChange={e => setForm({...form, year: e.target.value})} />
                </label>
                {isSeries && (
                  <label>
                    <span>Saisons</span>
                    <input type="number" value={form.seasons} onChange={e => setForm({...form, seasons: e.target.value})} />
                  </label>
                )}
                <label className={isSeries ? '' : 'full'}>
                  <span>Genre</span>
                  <input type="text" value={form.genre} onChange={e => setForm({...form, genre: e.target.value})} placeholder={isMedia ? 'Drame, Action...' : 'Roman, SF...'} />
                </label>
                <label className="full">
                  <span>Source / Reco</span>
                  <input type="text" value={form.source} onChange={e => setForm({...form, source: e.target.value})} placeholder="Reco ami..." />
                </label>
                <label className="checkbox">
                  <input type="checkbox" checked={form.watched} onChange={e => setForm({...form, watched: e.target.checked})} />
                  <span>{isMedia ? 'Déjà vu' : 'Déjà lu'}</span>
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
