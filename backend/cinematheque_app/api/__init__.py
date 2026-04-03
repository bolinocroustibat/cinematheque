from ninja import Router

from cinematheque_app.api.books import router as books_router
from cinematheque_app.api.movies_recommendations import (
    router as movies_recommendations_router,
)
from cinematheque_app.api.movies import router as movies_router
from cinematheque_app.api.movies_palettes import router as movies_palettes_router
from cinematheque_app.api.series import router as series_router

router = Router()
router.add_router("/movies", movies_router, tags=["movies"])
router.add_router(
    "/movies/recommendations",
    movies_recommendations_router,
    tags=["movies-recommendations"],
)
router.add_router("/series", series_router, tags=["series"])
router.add_router("/books", books_router, tags=["books"])
router.add_router("/movies/palettes", movies_palettes_router, tags=["palettes"])
