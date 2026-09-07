'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { saveContentBlockAction } from '@/app/actions/admin';
import { emptyActionState } from '@/lib/forms';
import { Field, FormMessage, TextArea, TextInput } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 size={15} className="animate-spin" aria-hidden />}
      {pending ? 'Saving…' : 'Save content'}
    </Button>
  );
}

export function ContentBlockForm({
  defaults,
}: {
  defaults: {
    key: string;
    page: string;
    title: string;
    subtitle: string;
    body: string;
    extra: string;
    image_path: string | null;
  };
}) {
  const [state, action] = useActionState(saveContentBlockAction, emptyActionState);

  let prettyExtra = defaults.extra;
  try {
    if (defaults.extra && defaults.extra !== '{}') {
      prettyExtra = JSON.stringify(JSON.parse(defaults.extra), null, 2);
    }
  } catch {
    /* keep as-is */
  }

  return (
    <form action={action} className="space-y-4" noValidate encType="multipart/form-data">
      <FormMessage state={state} />
      <input type="hidden" name="key" value={defaults.key} />
      <input type="hidden" name="page" value={defaults.page} />

      <Field label="Heading" htmlFor="content-title">
        <TextInput id="content-title" name="title" defaultValue={defaults.title} />
      </Field>
      <Field label="Sub-heading" htmlFor="content-subtitle">
        <TextArea id="content-subtitle" name="subtitle" rows={2} defaultValue={defaults.subtitle} />
      </Field>
      <Field label="Body" htmlFor="content-body" hint="Leave a blank line between paragraphs.">
        <TextArea id="content-body" name="body" rows={8} defaultValue={defaults.body} />
      </Field>
      <Field
        label="Structured fields (JSON)"
        htmlFor="content-extra"
        hint="Used for repeatable items such as divisions, values, process steps and statistics. Leave unchanged if you are not sure."
        error={state.errors?.extra}
      >
        <TextArea
          id="content-extra"
          name="extra"
          rows={10}
          defaultValue={prettyExtra}
          className="font-mono text-xs"
          error={!!state.errors?.extra}
        />
      </Field>
      <Field label="Image" htmlFor="content-image" hint="Replaces the current image. Optimised automatically on upload.">
        {defaults.image_path && (
          <p className="mb-2 text-xs text-navy-500">
            Current: <span className="font-mono">{defaults.image_path}</span>
          </p>
        )}
        <input type="hidden" name="existing_image" value={defaults.image_path || ''} />
        <input
          id="content-image"
          name="image"
          type="file"
          accept="image/*"
          className="block w-full text-sm text-navy-600 file:mr-3 file:rounded-lg file:border-0 file:bg-navy-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-navy-800"
        />
      </Field>

      <div className="flex flex-wrap gap-3">
        <Submit />
        <Link href="/dashboard/content" className="inline-flex items-center rounded-xl border border-navy-200 px-5 py-2.5 text-sm font-medium text-navy-900 hover:bg-navy-50">
          Back
        </Link>
      </div>
    </form>
  );
}
