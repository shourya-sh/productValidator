from transformers import CLIPTokenizerFast

tokenizer = CLIPTokenizerFast.from_pretrained("openai/clip-vit-base-patch32")

def truncate_description(text, max_tokens=77):
    encoded = tokenizer(
        text,
        truncation=True,
        max_length=max_tokens,
        return_tensors="pt",
        return_attention_mask=False,
        return_token_type_ids=False
    )
    # Decode truncated tokens back to text
    truncated_text = tokenizer.decode(encoded["input_ids"][0], skip_special_tokens=True)
    return truncated_text
