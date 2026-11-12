import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { renderPolicyNodes } from './policyContent.js'

const text = value => ({ nodeType: 3, textContent: value })
const element = (tagName, children = []) => ({ nodeType: 1, tagName, childNodes: children })

test('preserves policy formatting without interpreting attributes or scripts', () => {
  const nodes = [
    element('P', [text('Policy '), element('STRONG', [text('text')]), element('BR')]),
    element('UL', [element('LI', [text('First item')])]),
    element('SCRIPT', [text('alert(1)')]),
    element('IMG'),
    element('H2', [text('Next section')]),
  ]
  const html = renderToStaticMarkup(createElement(Fragment, null, renderPolicyNodes(nodes)))
  assert.equal(html, '<p>Policy <strong>text</strong><br/></p><ul><li>First item</li></ul><h2>Next section</h2>')
})
