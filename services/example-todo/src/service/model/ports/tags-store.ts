import type { TodoIdentifierType } from "../dto/identifier";
import type { TagType } from "../dto/tag";

/** Workspace-bound persistence contract for tag records. */
export interface TagsStore {
  /** Finds one tag by identifier, returning `null` when it is absent. */
  findById(id: TodoIdentifierType): Promise<TagType | null>;

  /** Finds matching tags ordered by name. */
  findByIds(ids: TodoIdentifierType[]): Promise<TagType[]>;

  /** Lists every tag in the bound workspace ordered by name. */
  findAll(): Promise<TagType[]>;

  /** Reports whether the bound workspace already contains a tag name. */
  existsByName(name: string): Promise<boolean>;

  /** Persists a tag and returns the stored record. */
  insert(tag: TagType): Promise<TagType>;
}
