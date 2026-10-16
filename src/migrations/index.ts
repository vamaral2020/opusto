import * as migration_20261013_182800_initial_schema from './20261013_182800_initial_schema'
import * as migration_20261016_180912_cms_managed_images from './20261016_180912_cms_managed_images'

export const migrations = [
  {
    up: migration_20261013_182800_initial_schema.up,
    down: migration_20261013_182800_initial_schema.down,
    name: '20261013_182800_initial_schema',
  },
  {
    up: migration_20261016_180912_cms_managed_images.up,
    down: migration_20261016_180912_cms_managed_images.down,
    name: '20261016_180912_cms_managed_images',
  },
]
