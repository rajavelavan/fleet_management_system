import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.database import AsyncSessionLocal
from app.models.user import User, UserRole

logger = logging.getLogger("fleet.seed")

DEFAULT_USERS = [
    {
        "email": "admin@fleet.local",
        "password": "AdminPassword123!",
        "role": UserRole.ADMIN,
        "is_active": True,
    },
    {
        "email": "dispatcher@fleet.local",
        "password": "DispatcherPassword123!",
        "role": UserRole.DISPATCHER,
        "is_active": True,
    },
    {
        "email": "driver@fleet.local",
        "password": "DriverPassword123!",
        "role": UserRole.DRIVER,
        "is_active": True,
    },
]


async def seed_initial_users(session: AsyncSession | None = None) -> None:
    """Seed initial system users idempotently for development and testing."""
    close_session = False
    if session is None:
        session = AsyncSessionLocal()
        close_session = True

    try:
        for user_data in DEFAULT_USERS:
            stmt = select(User).where(User.email == user_data["email"])
            result = await session.execute(stmt)
            existing_user = result.scalar_one_or_none()
            if not existing_user:
                new_user = User(
                    email=user_data["email"],
                    hashed_password=get_password_hash(user_data["password"]),
                    role=user_data["role"],
                    is_active=user_data["is_active"],
                )
                session.add(new_user)
                logger.info(
                    f"Seeded user: {user_data['email']} with role {user_data['role'].value}"
                )
        await session.commit()
    except Exception as e:
        await session.rollback()
        logger.error(f"Error seeding initial users: {e}")
        raise
    finally:
        if close_session:
            await session.close()


if __name__ == "__main__":
    import asyncio

    asyncio.run(seed_initial_users())
