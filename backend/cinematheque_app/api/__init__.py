from ninja import Router

from cinematheque_app.api.books import router as books_router
from cinematheque_app.api.movies import router as movies_router
from cinematheque_app.api.palettes import router as palettes_router
from cinematheque_app.api.series import router as series_router

router = Router()
router.add_router("/movies", movies_router, tags=["movies"])
router.add_router("/series", series_router, tags=["series"])
router.add_router("/books", books_router, tags=["books"])
router.add_router("/palettes", palettes_router, tags=["palettes"])
