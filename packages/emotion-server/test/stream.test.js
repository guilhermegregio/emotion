// @flow
/**
 * @jest-environment node
*/
import React from 'react'
// $FlowFixMe
import { renderToNodeStream, renderToString } from 'react-dom/server'
import {
  getComponents,
  getInjectedRules,
  createBigComponent,
  getCssFromChunks,
  setHtml
} from './util'
import { JSDOM } from 'jsdom'

const renderToStringWithStream = (element, { renderStylesToNodeStream }) =>
  new Promise((resolve, reject) => {
    const stream = renderToNodeStream(element).pipe(renderStylesToNodeStream())
    let html = ''
    stream.on('data', data => {
      html += data.toString()
    })
    stream.on('end', () => {
      resolve(html)
    })
    stream.on('error', error => {
      reject(error)
    })
  })

let emotion
let emotionServer
let reactEmotion

describe('renderStylesToNodeStream', () => {
  beforeEach(() => {
    global.__SECRET_EMOTION__ = undefined
    jest.resetModules()
    emotion = require('emotion')
    emotionServer = require('emotion-server')
    reactEmotion = require('react-emotion')
  })
  test('renders styles with ids', async () => {
    const { Page1, Page2 } = getComponents(emotion, reactEmotion)
    expect(
      await renderToStringWithStream(<Page1 />, emotionServer)
    ).toMatchSnapshot()
    expect(
      await renderToStringWithStream(<Page2 />, emotionServer)
    ).toMatchSnapshot()
  })
  test('renders large recursive component', async () => {
    const BigComponent = createBigComponent(emotion)
    expect(
      await renderToStringWithStream(
        <BigComponent count={200} />,
        emotionServer
      )
    ).toMatchSnapshot()
  })
})
describe('hydration', () => {
  afterAll(() => {
    global.document = undefined
    global.window = undefined
  })
  beforeEach(() => {
    jest.resetModules()
    global.__SECRET_EMOTION__ = undefined
    emotion = require('emotion')
    emotionServer = require('emotion-server')
    reactEmotion = require('react-emotion')
  })
  test('only inserts rules that are not in the critical css', async () => {
    const { Page1 } = getComponents(emotion, reactEmotion)
    const html = await renderToStringWithStream(<Page1 />, emotionServer)
    expect(html).toMatchSnapshot()
    const { window } = new JSDOM(html)
    global.document = window.document
    global.window = window
    global.__SECRET_EMOTION__ = undefined
    setHtml(html, document)
    jest.resetModules()
    emotion = require('emotion')
    emotionServer = require('emotion-server')
    reactEmotion = require('react-emotion')
    expect(emotion.caches.registered).toEqual({})

    const { Page1: NewPage1 } = getComponents(emotion, reactEmotion)
    renderToString(<NewPage1 />)
    expect(getInjectedRules(emotion)).toMatchSnapshot()
    expect(getCssFromChunks(document)).toMatchSnapshot()
  })
})