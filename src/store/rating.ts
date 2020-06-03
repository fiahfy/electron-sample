import { Module, VuexModule, Mutation } from 'vuex-module-decorators'

@Module({
  name: 'rating',
  stateFactory: true,
  namespaced: true,
})
export default class RatingModule extends VuexModule {
  ratings: { [filePath: string]: number } = {}

  get getRating() {
    return ({ filePath }: { filePath: string }) => this.ratings[filePath] || 0
  }

  @Mutation
  setRating({ filePath, rating }: { filePath: string; rating: number }) {
    if (rating) {
      this.ratings = {
        ...this.ratings,
        [filePath]: rating,
      }
    } else {
      const ratings = { ...this.ratings }
      delete ratings[filePath]
      this.ratings = ratings
    }
  }
}
