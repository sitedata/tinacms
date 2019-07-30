import { Form, FormOptions } from '@forestryio/cms'
import { useCMSForm } from '@forestryio/cms-react'
import {
  ERROR_MISSING_CMS_GATSBY,
  ERROR_MISSING_REMARK_ID,
  ERROR_MISSING_REMARK_PATH,
} from '../errors'
import { useEffect, useMemo } from 'react'

let throttle = require('lodash.throttle')

interface RemarkNode {
  id: string
  frontmatter: any
  html: string
  rawMarkdownBody: string
  [key: string]: any
}

export function useRemarkForm(
  markdownRemark: RemarkNode,
  formOverrrides: Partial<FormOptions<any>> = {},
  timeout: Number = 100
) {
  if (!markdownRemark) {
    return [markdownRemark, null]
  }
  if (typeof markdownRemark.id === 'undefined') {
    throw new Error(ERROR_MISSING_REMARK_ID)
  }
  // TODO: Only required when saving to local filesystem.
  if (typeof markdownRemark.fileAbsolutePath === 'undefined') {
    throw new Error(ERROR_MISSING_REMARK_PATH)
  }
  try {
    let throttledWriteToDisk = useMemo(() => {
      return throttle(writeToDisk, timeout)
    }, [timeout])

    let [values, form] = useCMSForm({
      name: `markdownRemark:${markdownRemark.id}`,
      initialValues: markdownRemark,
      fields: generateFields(markdownRemark),
      onSubmit(data) {
        if (process.env.NODE_ENV === 'development') {
          // return writeToDisk(data)
        } else {
          console.log('Not supported')
        }
      },
      ...formOverrrides,
    })

    useEffect(() => {
      if (!form) return
      return form.subscribe(
        (formState: any) => {
          throttledWriteToDisk(formState.values)
        },
        { values: true }
      )
    }, [form])

    return [markdownRemark, form]
  } catch (e) {
    throw new Error(ERROR_MISSING_CMS_GATSBY)
  }
}

function generateFields(post: RemarkNode) {
  let frontmatterFields = Object.keys(post.frontmatter).map(key => ({
    component: 'text',
    name: `frontmatter.${key}`,
  }))

  return [
    ...frontmatterFields,
    { component: 'textarea', name: 'rawMarkdownBody' },
  ]
}

interface RemarkFormProps extends Partial<FormOptions<any>> {
  remark: RemarkNode
  render(renderProps: { form: Form; markdownRemark: any }): JSX.Element
  timeout?: number
}

export function RemarkForm({
  remark,
  render,
  timeout,
  ...options
}: RemarkFormProps) {
  let [markdownRemark, form] = useRemarkForm(remark, options, timeout)

  return render({ form, markdownRemark })
}

function writeToDisk(data: any) {
  // @ts-ignore
  return fetch('http://localhost:4567/markdownRemark', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(data),
  })
    .then(response => {
      console.log(response.json())
    })
    .catch(e => {
      console.error(e)
    })
}
