name: Feature Request
description: Suggest a new feature or enhancement for the project.
title: "[Feature Request]: "
labels: ["enhancement", "triage"]
assignees:
  - aardenfell
body:
  - type: markdown
    attributes:
      value: |
        Thanks for suggesting a feature! Please take a moment to fill out the form below to help us better understand your idea.

  - type: input
    id: contact
    attributes:
      label: Contact Details
      description: How can we reach out to you for further discussion, if necessary?
      placeholder: "e.g., email, @discord, etc."
    validations:
      required: false

  - type: textarea
    id: feature-summary
    attributes:
      label: Feature Summary
      description: Provide a concise summary of the feature or enhancement.
      placeholder: "e.g., Add support for multiple language translations."
    validations:
      required: true

  - type: textarea
    id: motivation
    attributes:
      label: Motivation
      description: Why is this feature important? How will it help the project or users?
      placeholder: "e.g., It will make the project more accessible to non-English speakers."
    validations:
      required: true

  - type: textarea
    id: proposed-solution
    attributes:
      label: Proposed Solution
      description: Describe your proposed solution in detail.
      placeholder: "e.g., Add a dropdown menu for selecting the language, and store translations in a JSON file."
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives Considered
      description: If applicable, describe any alternatives you've considered.
      placeholder: "e.g., Use an online translation API instead of local files."
    validations:
      required: false

  - type: textarea
    id: additional-context
    attributes:
      label: Additional Context
      description: Add any other context, screenshots, or examples related to your feature request.
      placeholder: "e.g., Links to similar projects, screenshots of similar features, etc."
    validations:
      required: false

  - type: checkboxes
    id: terms
    attributes:
      label: Agreement
      description: By submitting this feature request, you agree to follow our [Code of Conduct](https://github.com/Aardenfell/TheHolyAutomation/blob/main/CODE_OF_CONDUCT.md).
      options:
        - label: I agree to follow this project's Code of Conduct
          required: true
