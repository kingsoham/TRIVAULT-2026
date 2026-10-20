from typing import List


class ShardingError(Exception):
    """Exception raised for errors during sharding or reassembly operations."""
    pass


def split_data(data: bytes, number_of_shards: int = 3) -> List[bytes]:
    """
    Split a sequence of bytes into exactly `number_of_shards` ordered byte chunks.
    
    In TriVault, number_of_shards must be exactly 3.
    Even distribution algorithm:
      - Divides total length L into base_size = L // 3.
      - Distributes any remainder (L % 3) across the first shards.
      - Safely handles empty inputs (L = 0) and small inputs (L < 3).
    
    Returns a list of exactly 3 byte objects: [shard_1, shard_2, shard_3].
    """
    if not isinstance(data, (bytes, bytearray)):
        raise TypeError("Data to shard must be bytes or bytearray.")

    if number_of_shards != 3:
        raise ValueError(f"TriVault architecture strictly requires 3 shards. Requested: {number_of_shards}")

    total_length = len(data)
    base_size = total_length // 3
    remainder = total_length % 3

    # Calculate exact shard lengths
    shard_lengths = [
        base_size + (1 if remainder > 0 else 0),
        base_size + (1 if remainder > 1 else 0),
        base_size
    ]

    shards: List[bytes] = []
    offset = 0
    for length in shard_lengths:
        chunk = bytes(data[offset:offset + length])
        shards.append(chunk)
        offset += length

    return shards


def combine_shards(shards: List[bytes]) -> bytes:
    """
    Reassemble exactly 3 ordered shard chunks into the original encrypted sequence.
    
    Validates:
      - Input must be a list of exactly 3 items.
      - Each item must be valid bytes (empty bytes b"" are permitted).
    
    Returns the concatenated byte sequence.
    """
    if not isinstance(shards, list):
        raise TypeError("Shards must be provided as a list of bytes.")

    if len(shards) != 3:
        raise ShardingError(f"Reassembly requires exactly 3 shards. Found: {len(shards)}")

    for idx, shard in enumerate(shards, start=1):
        if not isinstance(shard, (bytes, bytearray)):
            raise TypeError(f"Shard {idx} is invalid: expected bytes, got {type(shard).__name__}.")

    return b"".join(shards)
