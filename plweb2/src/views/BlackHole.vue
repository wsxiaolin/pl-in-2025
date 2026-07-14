<template>
  <div id="blackhole">
    <Header>
      <h1>{{ $t('blackhole.title') }}</h1>
    </Header>
    <!-- Height：50px fixed -->
    <main>
      <div v-show="loading" class="loading"></div>
      <div v-show="!loading" class="block-container">
        <n-grid :x-gap="12" :y-gap="12" :cols="blockItemsPerRow">
          <n-gi
            v-for="block in blocks.filter((i) => i.Summaries.length > 0)"
            :key="getBlockKey(block)"
          >
            <div class="block" style="height: 100%">
              <TopicBlock
                v-if="isTopicBlock(block)"
                :block="block"
                :activityProc="
                  (event) =>
                    getActivityProc(block.AuxiliaryLink || 'internal://co-dev')?.(event) ??
                    undefined
                "
              />
              <Block v-else :block="block" :maxProjectsPerBlock="maxProjectsPerBlock" />
            </div>
          </n-gi>
        </n-grid>
      </div>
    </main>
    <Footer></Footer>
  </div>
</template>

<script setup lang="ts">
import { useResponsive } from '../layout/useResponsive'
import { ref, onMounted, onActivated, watch } from 'vue'
import { useRoute } from 'vue-router'
import Header from '../components/utils/Header.vue'
import TopicBlock from '../components/blocks/TopicBlock.vue'
import Block from '../components/blocks/Block.vue'
import Footer from '../components/utils/Footer.vue'
import { getData } from '@services/api/getData.ts'
import { showAPiError } from '@popup/index.ts'
import { removeToken } from '@services/utils.ts'
import { useI18n } from 'vue-i18n'
import { NGrid, NGi } from 'naive-ui'
import { getPath } from '@services/utils.ts'
import type {
  ListBlock,
  TopicBlock as TopicBlockType,
} from '@services/../pl-serve-type-main/type/main'

import '../layout/loading.css'
import '../layout/startPage.css'

const loading = ref(true)
const blocks = ref<Array<ListBlock | TopicBlockType>>([])

function isTopicBlock(block: ListBlock | TopicBlockType): block is TopicBlockType {
  return block.$type === 'Quantum.Models.Contents.TopicBlock, Quantum Models'
}

function getBlockKey(block: ListBlock | TopicBlockType) {
  return isTopicBlock(block) ? block.Subject : block.Header
}

const goToWebCommunity = () => {
  window.$Logger.logEvent({
    category: 'Activity',
    action: 'Visit-External',
    label: 'https://pl.turtlesim.com',
    timestamp: Date.now(),
  })
  window.open('https://pl.turtlesim.com')
}

const goToDevelopment = () => {
  window.$Logger.logEvent({
    category: 'Activity',
    action: 'Visit-External',
    label: 'https://github.com/NetLogo-Mobile/plweb2',
    timestamp: Date.now(),
  })
  window.open(getPath('/@root/about'))
}

// Mabey some activity links will be specific to the web version one day
// @see Interceptor.AfterRequest
const activityLinkMap: Record<string, () => void> = {
  'internal://forum': goToWebCommunity,
  'internal://co-dev': goToDevelopment,
}

const getActivityProc = (link: string | undefined): ((event: MouseEvent) => void) => {
  const fn = link ? activityLinkMap[link] : undefined
  return fn
    ? (event: MouseEvent) => {
        event?.preventDefault?.()
        fn()
      }
    : () => {}
}

const { blockItemsPerRow, maxProjectsPerBlock } = useResponsive()
const route = useRoute()

const { t } = useI18n()

const githubDataUrl = import.meta.env.VITE_GITHUB_DATA_URL as string

async function fetchFromGithub(filepath: string) {
  const url = `${githubDataUrl}/gushishang/pl-discussions-before-2025-12/main/discussions/${filepath}.json`
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data: { Message: string; Data: { Blocks: Array<ListBlock | TopicBlockType> } } =
      await response.json()
    loading.value = false
    blocks.value = [...(data.Data?.Blocks ?? [])]
  } catch (e) {
    console.error('Failed to fetch GitHub data:', e)
    loading.value = false
  }
}

async function fetchLibrary() {
  const getLibraryResponse = await getData('/Contents/GetLibrary', {
    Identifier: 'Discussions',
    Language: 'Chinese',
  })

  if (getLibraryResponse.Status !== 200 || !getLibraryResponse.Data) {
    showAPiError(
      t('errors.apiErrorTitle'),
      t('errors.apiErrorMessage', {
        path: '/Contents/GetLibrary',
        status: getLibraryResponse.Status,
        message: getLibraryResponse.Message,
      }),
      fetchLibrary,
    )
    const _req = removeToken({
      Identifier: 'Discussions',
      Language: 'Chinese',
    })
    const _res = removeToken(getLibraryResponse)
    window.$ErrorLogger.captureApiError(
      'POST',
      '/Contents/GetLibrary',
      getLibraryResponse.Status,
      _res,
      _req,
    )
    console.error(`/Contents/GetLibrary returned ${getLibraryResponse.Status}`, _res)
    return
  }
  loading.value = false
  blocks.value = getLibraryResponse.Data.Blocks
}

let initialLoadDone = false

onMounted(async () => {
  const filepath = route.query.filepath as string | undefined
  if (filepath) {
    await fetchFromGithub(filepath)
  } else {
    await fetchLibrary()
  }
  initialLoadDone = true
})

watch(
  () => route.query.filepath,
  async (filepath) => {
    if (!initialLoadDone) return
    loading.value = true
    if (filepath) {
      await fetchFromGithub(filepath as string)
    } else {
      await fetchLibrary()
    }
  },
)

onActivated(() => {
  window.$Logger.logPageView({
    pageLink: '/Discussions/',
    timeStamp: Date.now(),
  })
  window.$Logger.logPageView({
    pageLink: '/Library/Discussions/',
    timeStamp: Date.now(),
  })
})
</script>

<style scoped></style>
