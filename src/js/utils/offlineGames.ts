import storage from '../storage'
import * as cloneDeep from 'lodash/cloneDeep'
import * as difference from 'lodash/difference'
import { AnalysisData, AnalysisStep } from '../ui/analyse/interfaces'
import { NowPlayingGame } from '../lichess/interfaces'
import { OnlineGameData, OfflineGameData } from '../lichess/interfaces/game'
import { GameSituation } from '../chess'

const otbStorageKey = 'otb.current'
const aiStorageKey = 'ai.current'

export interface StoredOfflineGame {
  data: OfflineGameData
  situations: Array<GameSituation>
  ply: number
}

export type StoredOfflineGames = { [id: string]: OnlineGameData }

export function getCurrentOTBGame(): StoredOfflineGame | null {
  return storage.get<StoredOfflineGame>(otbStorageKey)
}

export function getAnalyseData(data: StoredOfflineGame): AnalysisData | null {
  if (!data) return null
  const aData = <AnalysisData>data.data
  aData.steps = data.situations.map((o: GameSituation) => {
    const step: AnalysisStep = {
      fen: o.fen,
      ply: o.ply,
      check: o.check,
      checkCount: o.checkCount,
      san: o.pgnMoves.length ? o.pgnMoves[o.pgnMoves.length - 1] : null,
      uci: o.uciMoves.length ? o.uciMoves[o.uciMoves.length - 1] : null,
      dests: o.dests,
      drops: o.drops,
      crazy: o.crazyhouse,
      pgnMoves: o.pgnMoves,
      end: o.end,
      player: o.player
    }
    return step
  })
  return aData
}

export function setCurrentOTBGame(game: StoredOfflineGame): void {
  storage.set(otbStorageKey, game)
}

export function getCurrentAIGame(): StoredOfflineGame | null {
  return storage.get<StoredOfflineGame>(aiStorageKey)
}

export function setCurrentAIGame(game: StoredOfflineGame): void {
  storage.set(aiStorageKey, game)
}

const offlineCorresStorageKey = 'offline.corres.games'

export function getOfflineGames(): Array<OnlineGameData> {
  const stored = storage.get<StoredOfflineGames>(offlineCorresStorageKey)
  let arr: OnlineGameData[] = []
  if (stored) {
    for (const id in stored) {
      arr.push(stored[id])
    }
  }
  return arr
}

let nbOfflineGames: number | undefined
export function hasOfflineGames(): boolean {
  nbOfflineGames =
    nbOfflineGames !== undefined ? nbOfflineGames : getOfflineGames().length

  return nbOfflineGames > 0
}

export function getOfflineGameData(id: string): OnlineGameData | null {
  const stored = storage.get<StoredOfflineGames>(offlineCorresStorageKey)
  return stored && stored[id]
}

export function saveOfflineGameData(id: string, gameData: OnlineGameData) {
  const stored = storage.get<StoredOfflineGames>(offlineCorresStorageKey) || {}
  const toStore = cloneDeep(gameData)
  toStore.player.onGame = false
  toStore.opponent.onGame = false
  if (toStore.player.user) toStore.player.user.online = false
  if (toStore.opponent.user) toStore.opponent.user.online = false
  stored[id] = toStore
  storage.set(offlineCorresStorageKey, stored)
  nbOfflineGames = undefined
}

export function removeOfflineGameData(id: string) {
  const stored = storage.get<StoredOfflineGames>(offlineCorresStorageKey)
  if (stored && stored[id]) {
    delete stored[id]
    nbOfflineGames = undefined
  }
  storage.set(offlineCorresStorageKey, stored)
}

export function syncWithNowPlayingGames(nowPlaying: Array<NowPlayingGame>) {
  if (nowPlaying === undefined) return

  const stored = storage.get<StoredOfflineGames>(offlineCorresStorageKey) || {}
  const storedIds = Object.keys(stored)
  const toRemove = difference(storedIds, nowPlaying.map((g: NowPlayingGame) => g.fullId))

  if (toRemove.length > 0) {
    toRemove.forEach(id => {
      if (stored && stored[id]) {
        delete stored[id]
      }
    })
    storage.set(offlineCorresStorageKey, stored)
    nbOfflineGames = undefined
  }
}
