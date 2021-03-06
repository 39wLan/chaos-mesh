/*
 * Copyright 2021 Chaos Mesh Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { Box, Button, Grid, Grow } from '@material-ui/core'
import { setAlert, setConfirm } from 'slices/globalStatus'
import { useEffect, useState } from 'react'
import { useHistory, useParams } from 'react-router-dom'

import Alert from '@material-ui/lab/Alert'
import ArchiveOutlinedIcon from '@material-ui/icons/ArchiveOutlined'
import { Event } from 'api/events.type'
import EventsTimeline from 'components/EventsTimeline'
import { ExperimentSingle } from 'api/experiments.type'
import Loading from 'components-mui/Loading'
import ObjectConfiguration from 'components/ObjectConfiguration'
import Paper from 'components-mui/Paper'
import PaperTop from 'components-mui/PaperTop'
import PauseCircleOutlineIcon from '@material-ui/icons/PauseCircleOutline'
import PlayCircleOutlineIcon from '@material-ui/icons/PlayCircleOutline'
import Space from 'components-mui/Space'
import T from 'components/T'
import api from 'api'
import loadable from '@loadable/component'
import { useIntl } from 'react-intl'
import { useStoreDispatch } from 'store'
import yaml from 'js-yaml'

const YAMLEditor = loadable(() => import('components/YAMLEditor'))

export default function Single() {
  const history = useHistory()
  const { uuid } = useParams<{ uuid: uuid }>()

  const intl = useIntl()

  const dispatch = useStoreDispatch()

  const [loading, setLoading] = useState(true)
  const [single, setSingle] = useState<ExperimentSingle>()
  const [events, setEvents] = useState<Event[]>([])

  const fetchExperiment = () => {
    api.experiments
      .single(uuid)
      .then(({ data }) => setSingle(data))
      .catch(console.error)
  }

  useEffect(() => {
    fetchExperiment()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const fetchEvents = () => {
      api.events
        .events({ object_id: uuid, limit: 999 })
        .then(({ data }) => setEvents(data))
        .catch(console.error)
        .finally(() => {
          setLoading(false)
        })
    }

    if (single) {
      fetchEvents()
    }
  }, [uuid, single])

  const handleSelect = (action: string) => () => {
    switch (action) {
      case 'archive':
        dispatch(
          setConfirm({
            title: `${T('archives.single', intl)} ${single!.name}`,
            description: T('experiments.deleteDesc', intl),
            handle: handleAction('archive'),
          })
        )

        break
      case 'pause':
        dispatch(
          setConfirm({
            title: `${T('common.pause', intl)} ${single!.name}`,
            description: T('experiments.pauseDesc', intl),
            handle: handleAction('pause'),
          })
        )

        break
      case 'start':
        dispatch(
          setConfirm({
            title: `${T('common.start', intl)} ${single!.name}`,
            description: T('experiments.startDesc', intl),
            handle: handleAction('start'),
          })
        )

        break
    }
  }

  const handleAction = (action: string) => () => {
    let actionFunc: any

    switch (action) {
      case 'archive':
        actionFunc = api.experiments.del

        break
      case 'pause':
        actionFunc = api.experiments.pause

        break
      case 'start':
        actionFunc = api.experiments.start

        break
      default:
        actionFunc = null
    }

    if (actionFunc) {
      actionFunc(uuid)
        .then(() => {
          dispatch(
            setAlert({
              type: 'success',
              message: T(`confirm.success.${action}`, intl),
            })
          )

          if (action === 'archive') {
            history.push('/experiments')
          }

          if (action === 'pause' || action === 'start') {
            setTimeout(fetchExperiment, 300)
          }
        })
        .catch(console.error)
    }
  }

  return (
    <>
      <Grow in={!loading} style={{ transformOrigin: '0 0 0' }}>
        <div>
          <Space spacing={6}>
            <Space direction="row">
              <Button
                variant="outlined"
                size="small"
                startIcon={<ArchiveOutlinedIcon />}
                onClick={handleSelect('archive')}
              >
                {T('archives.single')}
              </Button>
              {single?.status === 'paused' ? (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PlayCircleOutlineIcon />}
                  onClick={handleSelect('start')}
                >
                  {T('common.start')}
                </Button>
              ) : single?.status !== 'finished' ? (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PauseCircleOutlineIcon />}
                  onClick={handleSelect('pause')}
                >
                  {T('common.pause')}
                </Button>
              ) : null}
            </Space>

            {single?.failed_message && (
              <Alert severity="error">
                An error occurred: <b>{single.failed_message}</b>
              </Alert>
            )}

            <Paper>{single && <ObjectConfiguration config={single} />}</Paper>

            <Grid container>
              <Grid item xs={12} lg={6} sx={{ pr: 3 }}>
                <Paper sx={{ display: 'flex', flexDirection: 'column', height: 600 }}>
                  <PaperTop title={T('events.title')} boxProps={{ mb: 3 }} />
                  <Box flex={1} overflow="scroll">
                    <EventsTimeline events={events} />
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} lg={6} sx={{ pl: 3 }}>
                <Paper sx={{ height: 600, p: 0 }}>
                  {single && (
                    <Space display="flex" flexDirection="column" height="100%">
                      <PaperTop title={T('common.definition')} boxProps={{ p: 4.5, pb: 0 }} />
                      <Box flex={1}>
                        <YAMLEditor name={single.name} data={yaml.dump(single.kube_object)} download />
                      </Box>
                    </Space>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Space>
        </div>
      </Grow>

      {loading && <Loading />}
    </>
  )
}
