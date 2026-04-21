"""
Base repository interface and implementation.
"""

from abc import ABC, abstractmethod
from typing import List, Optional, TypeVar, Generic
from uuid import UUID

T = TypeVar('T')


class BaseRepository(ABC, Generic[T]):
    """
    Abstract base repository interface.
    """

    @abstractmethod
    def get_by_id(self, id: UUID) -> Optional[T]:
        """Get entity by ID"""
        pass

    @abstractmethod
    def get_all(self) -> List[T]:
        """Get all entities"""
        pass

    @abstractmethod
    def save(self, entity: T) -> T:
        """Save entity"""
        pass

    @abstractmethod
    def delete(self, id: UUID) -> None:
        """Delete entity by ID"""
        pass

    @abstractmethod
    def exists(self, id: UUID) -> bool:
        """Check if entity exists"""
        pass


class DjangoBaseRepository(BaseRepository[T]):
    """
    Base Django repository implementation.
    """

    def __init__(self, model_class):
        self.model_class = model_class

    def get_by_id(self, id: UUID) -> Optional[T]:
        try:
            return self.model_class.objects.get(id=id)
        except self.model_class.DoesNotExist:
            return None

    def get_all(self) -> List[T]:
        return list(self.model_class.objects.all())

    def save(self, entity: T) -> T:
        entity.save()
        return entity

    def delete(self, id: UUID) -> None:
        self.model_class.objects.filter(id=id).delete()

    def exists(self, id: UUID) -> bool:
        return self.model_class.objects.filter(id=id).exists()
